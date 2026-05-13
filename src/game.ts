import { MAX_FRAME_DT } from './config/constants';
import { AudioManager } from './engine/audio/audio-manager';
import { MusicClock } from './engine/audio/music-clock';
import { InputManager } from './engine/input/input-manager';
import { Renderer } from './engine/render/renderer';
import { SaveStore } from './engine/save/store';
import type { FrameStep, Scene } from './engine/scene/scene';
import { mulberry32, type Prng } from './engine/util/rng';
import { BattleScene } from './game/combat/battle-scene';
import { Genre } from './game/combat/genres';
import type { Combatant, EncounterSpec, PartyMember } from './game/combat/types';
import { makeBayouMookEncounter } from './game/encounters/bayou-mook';
import { makeDiminuendoEncounter } from './game/encounters/diminuendo';
import { makeBayouScene } from './game/overworld/regions/bayou';
import { makeJazzCityScene } from './game/overworld/regions/jazz-city';
import type { RegionId } from './game/overworld/types';
import { buildSaveSnapshot } from './game/save-snapshot';
import { GameOverScene } from './scenes/game-over-scene';
import { SaveSelectScene } from './scenes/save-select-scene';
import { SceneRouter, type SceneId } from './scenes/scene-router';
import { SettingsScene } from './scenes/settings-scene';
import { TitleScene } from './scenes/title-scene';
import type { SaveSlot, SaveV1, SettingsV1 } from './engine/save/types';
import { Textbox } from './ui/textbox';

const ACTIVE_SLOT: SaveSlot = 0;

const DEFAULT_SETTINGS: SettingsV1 = {
  audioOnlyCues: false,
  highContrast: false,
  musicVolume: 70,
  relaxedRhythm: false,
  sfxVolume: 80,
};

const PLACEHOLDER_BATTLE_PROMPT = 'On the beat! Press Beat to strike.';

const PLACEHOLDER_PARTY_MEMBER: PartyMember = {
  id: 'sol',
  name: 'Sol Reed',
  hp: 50,
  maxHp: 50,
  atk: 12,
  def: 5,
  focus: 50,
  genre: Genre.Jazz,
  moves: [{ kind: 'attack', moveId: 'brass-burst', name: 'Brass Burst', power: 30 }],
};

const HOLLOW_STREETLAMP: Combatant & { genre: Genre } = {
  id: 'hollow-streetlamp',
  name: 'Hollow Streetlamp',
  hp: 30,
  maxHp: 30,
  atk: 8,
  def: 3,
  focus: 0,
  genre: Genre.Discord,
};

const SWAMP_IMP: Combatant & { genre: Genre } = {
  id: 'swamp-imp',
  name: 'Swamp Imp',
  hp: 25,
  maxHp: 25,
  atk: 10,
  def: 2,
  focus: 0,
  genre: Genre.Blues,
};

const DIMINUENDO_COMBATANT: Combatant & { genre: Genre } = {
  id: 'diminuendo',
  name: 'Diminuendo',
  hp: 200,
  maxHp: 200,
  atk: 18,
  def: 10,
  focus: 70,
  genre: Genre.Blues,
};

const ENEMY_BY_ID: Record<string, Combatant & { genre: Genre }> = {
  'hollow-streetlamp': HOLLOW_STREETLAMP,
  'swamp-imp': SWAMP_IMP,
  diminuendo: DIMINUENDO_COMBATANT,
};

function lookupEnemy(id: string): Combatant & { genre: Genre } {
  const enemy = ENEMY_BY_ID[id];
  if (!enemy) {
    throw new Error(`Unknown enemy id: ${id}`);
  }
  return { ...enemy };
}

type EncounterKind = 'normal' | 'boss';

export interface GameOptions {
  readonly renderer?: Renderer;
  readonly input?: InputManager;
  readonly musicClock?: MusicClock;
  readonly audio?: AudioManager;
  readonly saveStore?: SaveStore;
  readonly rng?: Prng;
}

export class Game {
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly musicClock: MusicClock;
  readonly audio: AudioManager;
  readonly saveStore: SaveStore;
  readonly router: SceneRouter;
  readonly #rng: Prng;
  #activeScene: Scene;
  #animationFrame = 0;
  #startedAt = 0;
  #lastFrameAt = 0;
  /** Region the player is currently exploring (defaults to Jazz City on a fresh save). */
  #currentRegion: RegionId = 'jazz-city';
  /** Whether the next 'encounter' event should load a boss spec instead of a mook. */
  #nextEncounterKind: EncounterKind = 'normal';
  /** In-memory settings shown to the SettingsScene; persisted on apply. */
  #settings: SettingsV1 = { ...DEFAULT_SETTINGS };
  /** Last SaveV1 written to / loaded from the SaveStore (slot 0). */
  #latestSave: SaveV1 | null = null;

  constructor(options: GameOptions = {}) {
    this.renderer = options.renderer ?? new Renderer();
    this.input = options.input ?? new InputManager();
    this.musicClock = options.musicClock ?? new MusicClock(() => 0);
    this.audio = options.audio ?? new AudioManager();
    this.saveStore = options.saveStore ?? new SaveStore();
    this.#rng = options.rng ?? mulberry32(0xc0ffee);
    this.router = new SceneRouter();

    this.#activeScene = this.#makeScene(this.router.current());

    this.router.onChange((_from, to) => {
      this.#activeScene.exit();
      this.#activeScene = this.#makeScene(to);
      this.#activeScene.enter();
    });

    this.#activeScene.enter();
  }

  async init(): Promise<void> {
    await this.saveStore.init();
  }

  /**
   * Best-effort persistence to slot 0. Builds a SaveV1 from the live game
   * state and writes it. Failures are swallowed so a dev IndexedDB hiccup
   * never crashes the rAF loop.
   */
  #persist(): void {
    const snapshot = buildSaveSnapshot({
      existing: this.#latestSave ?? undefined,
      nowIso: new Date().toISOString(),
      region: this.#currentRegion,
      settings: this.#settings,
      slot: ACTIVE_SLOT,
    });
    this.#latestSave = snapshot;
    void this.saveStore.save(ACTIVE_SLOT, snapshot).catch(() => {
      // Best-effort: a dev environment without IndexedDB shouldn't crash.
    });
  }

  /**
   * Load the active slot's SaveV1 and restore #settings + #currentRegion.
   * Used by SaveSelectScene's onEvent handler before transitioning to
   * overworld. Silent no-op on missing slot or parse failure — the player
   * starts a fresh session instead.
   */
  async #loadSlot(slot: SaveSlot): Promise<void> {
    try {
      const save = await this.saveStore.load(slot);
      if (save === null) {
        return;
      }
      this.#latestSave = save;
      this.#settings = save.settings;
      if (save.region !== undefined) {
        this.#currentRegion = save.region;
      }
    } catch {
      // Corrupted / unreadable save — treat as a fresh session.
    }
  }

  mount(parent: HTMLElement): void {
    this.renderer.mount(parent);
  }

  start(now = performance.now()): void {
    this.#startedAt = now;
    this.#lastFrameAt = now;
    this.#animationFrame = requestAnimationFrame(this.#tick);
  }

  stop(): void {
    cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = 0;
  }

  readonly #tick = (now: number): void => {
    const dt = Math.min((now - this.#lastFrameAt) / 1000, MAX_FRAME_DT);
    this.#lastFrameAt = now;

    this.input.update(now);

    const step: FrameStep = {
      dt,
      now: now - this.#startedAt,
      beat: null,
      beatPhase: 0,
    };
    this.#activeScene.update(step);

    this.renderer.clear();
    this.#activeScene.render(this.renderer.ctx);

    this.#animationFrame = requestAnimationFrame(this.#tick);
  };

  #makeScene(id: SceneId): Scene {
    switch (id) {
      case 'title':
        return new TitleScene({
          renderer: this.renderer,
          input: this.input,
          onEvent: (event) => {
            this.router.transition(event);
          },
        });

      case 'settings':
        return new SettingsScene({
          renderer: this.renderer,
          input: this.input,
          audio: this.audio,
          settings: this.#settings,
          onEvent: (event, updated) => {
            if (event === 'apply' && updated !== undefined) {
              this.#settings = updated;
              this.#persist();
            }
            this.router.transition(event);
          },
        });

      case 'save-select':
        return new SaveSelectScene({
          renderer: this.renderer,
          input: this.input,
          store: this.saveStore,
          onEvent: (event, slotIndex) => {
            if (event === 'confirm' && slotIndex !== undefined) {
              // Load before transitioning. The transition is fired inside the
              // then() so a slow IndexedDB read doesn't strand the player on a
              // half-loaded overworld — the active scene is still the save
              // select until load completes.
              void this.#loadSlot(slotIndex).then(() => {
                this.router.transition(event);
              });
              return;
            }
            this.router.transition(event);
          },
        });

      case 'overworld': {
        const makeRegion =
          this.#currentRegion === 'bayou' ? makeBayouScene : makeJazzCityScene;
        return makeRegion(this.renderer, this.input, (event) => {
          if (event.kind === 'encounter') {
            this.#nextEncounterKind = 'normal';
            this.router.transition('encounter');
          } else if (event.kind === 'boss-encounter') {
            this.#nextEncounterKind = 'boss';
            this.router.transition('encounter');
          } else if (event.kind === 'region-change') {
            this.#currentRegion = event.targetRegion;
            this.#persist();
            this.#activeScene.exit();
            this.#activeScene = this.#makeScene('overworld');
            this.#activeScene.enter();
          }
        });
      }

      case 'battle': {
        const encounter: EncounterSpec =
          this.#nextEncounterKind === 'boss'
            ? makeDiminuendoEncounter({ lookupEnemy })
            : makeBayouMookEncounter({ lookupEnemy });
        return new BattleScene({
          renderer: this.renderer,
          input: this.input,
          musicClock: this.musicClock,
          textbox: new Textbox({ text: PLACEHOLDER_BATTLE_PROMPT }),
          party: [{ ...PLACEHOLDER_PARTY_MEMBER }],
          encounter,
          rng: this.#rng,
          onComplete: (outcome) => {
            // Phase-3: a successful recruitment ends the battle without a
            // victory/defeat decision. Treat it as a victory for routing so
            // the player returns to the overworld; recruited combatants are
            // surfaced to the save layer in a future wave.
            const event = outcome === 'recruited' ? 'victory' : outcome;
            this.#nextEncounterKind = 'normal';
            this.router.transition(event);
          },
        });
      }

      case 'game-over':
        return new GameOverScene({
          renderer: this.renderer,
          input: this.input,
          onEvent: () => {
            this.router.transition('confirm');
          },
        });
    }
  }
}
