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
import { OverworldScene } from './game/overworld/overworld-scene';
import { GameOverScene } from './scenes/game-over-scene';
import { SaveSelectScene } from './scenes/save-select-scene';
import { SceneRouter, type SceneId } from './scenes/scene-router';
import { TitleScene } from './scenes/title-scene';
import { Textbox } from './ui/textbox';

const PLACEHOLDER_BATTLE_PROMPT = 'A hollow streetlamp blocks your path. Press Beat on the beat!';

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

const PLACEHOLDER_ENEMY: Combatant & { genre: Genre } = {
  id: 'hollow-streetlamp',
  name: 'Hollow Streetlamp',
  hp: 30,
  maxHp: 30,
  atk: 8,
  def: 3,
  focus: 0,
  genre: Genre.Discord,
};

const PLACEHOLDER_ENCOUNTER: EncounterSpec = {
  mode: 'normal',
  bpm: 120,
  soundId: 'battle-placeholder',
  enemy: PLACEHOLDER_ENEMY,
};

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
          onEvent: () => {
            this.router.transition('confirm');
          },
        });

      case 'save-select':
        return new SaveSelectScene({
          renderer: this.renderer,
          input: this.input,
          store: this.saveStore,
          onEvent: (event) => {
            this.router.transition(event);
          },
        });

      case 'overworld':
        return OverworldScene.makeDefault(this.renderer, this.input, (event) => {
          if (event.kind === 'encounter') {
            this.router.transition('encounter');
          }
        });

      case 'battle':
        return new BattleScene({
          renderer: this.renderer,
          input: this.input,
          musicClock: this.musicClock,
          textbox: new Textbox({ text: PLACEHOLDER_BATTLE_PROMPT }),
          party: [PLACEHOLDER_PARTY_MEMBER],
          encounter: PLACEHOLDER_ENCOUNTER,
          rng: this.#rng,
          onComplete: (outcome) => {
            this.router.transition(outcome);
          },
        });

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
