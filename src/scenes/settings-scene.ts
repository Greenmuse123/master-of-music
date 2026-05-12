import { RENDER_H, RENDER_W } from '../config/constants';
import type { AudioManager, Bus } from '../engine/audio/audio-manager';
import type { InputManager } from '../engine/input/input-manager';
import type { Renderer } from '../engine/render/renderer';
import type { SettingsV1 } from '../engine/save/settings-types';
import type { FrameStep, Scene } from '../engine/scene/scene';

export type SettingsSceneEvent = 'cancel' | 'apply';

export type SettingsSceneEventHandler = (
  event: SettingsSceneEvent,
  updated?: SettingsV1,
) => void;

export interface SettingsSceneOptions {
  readonly renderer: Renderer;
  readonly input: Pick<InputManager, 'pressed'>;
  readonly audio: AudioManager;
  readonly settings: SettingsV1;
  readonly onEvent: SettingsSceneEventHandler;
}

type SettingsRow =
  | 'musicVolume'
  | 'sfxVolume'
  | 'relaxedRhythm'
  | 'highContrast'
  | 'audioOnlyCues'
  | 'apply'
  | 'back';

const ROWS: readonly SettingsRow[] = [
  'musicVolume',
  'sfxVolume',
  'relaxedRhythm',
  'highContrast',
  'audioOnlyCues',
  'apply',
  'back',
];

const SFX_BUSES: readonly Bus[] = ['sfx-attack', 'sfx-defense', 'sfx-world', 'ui', 'voice'];
const HEADER_TEXT = 'SETTINGS';
const HEADER_X = 80;
const HEADER_Y = 24;
const ROW_X = 80;
const CURSOR_X = 60;
const FIRST_ROW_Y = 56;
const ROW_SPACING = 20;
const VOLUME_STEP = 5;

export class SettingsScene implements Scene {
  readonly #renderer: Renderer;
  readonly #input: Pick<InputManager, 'pressed'>;
  readonly #audio: AudioManager;
  readonly #onEvent: SettingsSceneEventHandler;
  #draft: SettingsV1;
  #selected = 0;
  #active = false;

  constructor(options: SettingsSceneOptions) {
    this.#renderer = options.renderer;
    this.#input = options.input;
    this.#audio = options.audio;
    this.#onEvent = options.onEvent;
    this.#draft = { ...options.settings };
  }

  get renderer(): Renderer {
    return this.#renderer;
  }

  get selectedRow(): SettingsRow {
    return this.currentRow();
  }

  get draft(): SettingsV1 {
    return { ...this.#draft };
  }

  enter(_prev?: Scene): void {
    this.#active = true;
    this.#selected = 0;
  }

  exit(_next?: Scene): void {
    this.#active = false;
  }

  update(_step: FrameStep): void {
    if (!this.#active) {
      return;
    }

    if (this.#input.pressed('up')) {
      this.#selected = clamp(this.#selected - 1, 0, ROWS.length - 1);
    }
    if (this.#input.pressed('down')) {
      this.#selected = clamp(this.#selected + 1, 0, ROWS.length - 1);
    }

    const row = this.currentRow();
    if (this.#input.pressed('left')) {
      this.adjustRow(row, -VOLUME_STEP);
    }
    if (this.#input.pressed('right')) {
      this.adjustRow(row, VOLUME_STEP);
    }

    if (this.#input.pressed('confirm')) {
      if (row === 'apply') {
        this.#onEvent('apply', { ...this.#draft });
      }
      if (row === 'back') {
        this.#onEvent('cancel');
      }
    }
    if (this.#input.pressed('cancel')) {
      this.#onEvent('cancel');
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(HEADER_TEXT, HEADER_X, HEADER_Y);

    for (let i = 0; i < ROWS.length; i += 1) {
      const row = ROWS[i];
      if (row === undefined) {
        continue;
      }
      const y = FIRST_ROW_Y + i * ROW_SPACING;
      if (i === this.#selected) {
        ctx.fillText('>', CURSOR_X, y);
      }
      ctx.fillText(this.rowLabel(row), ROW_X, y);
    }
  }

  handleInput(_event: Event): void {
    return;
  }

  private currentRow(): SettingsRow {
    return ROWS[this.#selected] ?? 'musicVolume';
  }

  private adjustRow(row: SettingsRow, delta: number): void {
    if (row === 'musicVolume') {
      this.#draft = {
        ...this.#draft,
        musicVolume: clamp(this.#draft.musicVolume + delta, 0, 100),
      };
      this.#audio.setBusVolume('music', this.#draft.musicVolume / 100);
      return;
    }
    if (row === 'sfxVolume') {
      this.#draft = {
        ...this.#draft,
        sfxVolume: clamp(this.#draft.sfxVolume + delta, 0, 100),
      };
      for (const bus of SFX_BUSES) {
        this.#audio.setBusVolume(bus, this.#draft.sfxVolume / 100);
      }
      return;
    }
    if (delta !== 0) {
      this.toggleRow(row);
    }
  }

  private toggleRow(row: SettingsRow): void {
    if (row === 'relaxedRhythm') {
      this.#draft = { ...this.#draft, relaxedRhythm: !this.#draft.relaxedRhythm };
    }
    if (row === 'highContrast') {
      this.#draft = { ...this.#draft, highContrast: !this.#draft.highContrast };
    }
    if (row === 'audioOnlyCues') {
      this.#draft = { ...this.#draft, audioOnlyCues: !this.#draft.audioOnlyCues };
    }
  }

  private rowLabel(row: SettingsRow): string {
    if (row === 'musicVolume') {
      return `Music Volume ${this.#draft.musicVolume}%`;
    }
    if (row === 'sfxVolume') {
      return `SFX Volume ${this.#draft.sfxVolume}%`;
    }
    if (row === 'relaxedRhythm') {
      return `Relaxed Rhythm ${formatToggle(this.#draft.relaxedRhythm)}`;
    }
    if (row === 'highContrast') {
      return `High Contrast ${formatToggle(this.#draft.highContrast)}`;
    }
    if (row === 'audioOnlyCues') {
      return `Audio-Only Cues ${formatToggle(this.#draft.audioOnlyCues)}`;
    }
    if (row === 'apply') {
      return 'Apply';
    }
    return 'Back';
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatToggle(value: boolean): string {
  return value ? 'ON' : 'OFF';
}
