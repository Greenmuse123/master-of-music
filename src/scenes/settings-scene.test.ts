import { describe, expect, it, vi } from 'vitest';

import type { AudioManager } from '../engine/audio/audio-manager';
import type { InputAction } from '../engine/input/actions';
import type { InputManager } from '../engine/input/input-manager';
import type { Renderer } from '../engine/render/renderer';
import type { SettingsV1 } from '../engine/save/settings-types';
import type { FrameStep } from '../engine/scene/scene';
import { SceneRouter } from './scene-router';
import { SettingsScene } from './settings-scene';

function stubCtx(): CanvasRenderingContext2D & {
  fillRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
} {
  return {
    fillRect: vi.fn(),
    fillStyle: '',
    fillText: vi.fn(),
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D & {
    fillRect: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
  };
}

function makeInput(): {
  input: Pick<InputManager, 'pressed'>;
  press: (action: InputAction) => void;
} {
  const queue: InputAction[] = [];
  return {
    input: {
      pressed: (action: InputAction) => {
        const idx = queue.indexOf(action);
        if (idx < 0) {
          return false;
        }
        queue.splice(idx, 1);
        return true;
      },
    },
    press: (action) => {
      queue.push(action);
    },
  };
}

function makeAudio(): {
  audio: AudioManager;
  setBusVolume: ReturnType<typeof vi.fn>;
} {
  const setBusVolume = vi.fn();
  return { audio: { setBusVolume } as unknown as AudioManager, setBusVolume };
}

function makeSettings(overrides: Partial<SettingsV1> = {}): SettingsV1 {
  return {
    musicVolume: 50,
    sfxVolume: 50,
    relaxedRhythm: false,
    highContrast: false,
    audioOnlyCues: false,
    ...overrides,
  };
}

const renderer = {} as Renderer;
const step: FrameStep = { dt: 0.016, now: 0, beat: null, beatPhase: 0 };

describe('SettingsScene', () => {
  it('renders 7 rows by default', () => {
    const ctx = stubCtx();
    const { input } = makeInput();
    const scene = new SettingsScene({
      renderer,
      input,
      audio: makeAudio().audio,
      settings: makeSettings(),
      onEvent: vi.fn(),
    });

    scene.render(ctx);

    const drawn = ctx.fillText.mock.calls.map((call) => call[0] as string);
    const rows = drawn.filter((text) => text !== '>' && text !== 'SETTINGS');
    expect(rows).toEqual([
      'Music Volume 50%',
      'SFX Volume 50%',
      'Relaxed Rhythm OFF',
      'High Contrast OFF',
      'Audio-Only Cues OFF',
      'Apply',
      'Back',
    ]);
  });

  it('Down-Down navigates from Music to Relaxed Rhythm row', () => {
    const { input, press } = makeInput();
    const scene = new SettingsScene({
      renderer,
      input,
      audio: makeAudio().audio,
      settings: makeSettings(),
      onEvent: vi.fn(),
    });

    scene.enter();
    press('down');
    scene.update(step);
    press('down');
    scene.update(step);

    expect(scene.selectedRow).toBe('relaxedRhythm');
  });

  it('adjusts music slider by 5 percent and clamps to [0, 100]', () => {
    const { audio, setBusVolume } = makeAudio();
    const { input, press } = makeInput();
    const scene = new SettingsScene({
      renderer,
      input,
      audio,
      settings: makeSettings({ musicVolume: 5 }),
      onEvent: vi.fn(),
    });

    scene.enter();
    press('left');
    scene.update(step);
    expect(scene.draft.musicVolume).toBe(0);
    expect(setBusVolume).toHaveBeenLastCalledWith('music', 0);

    press('left');
    scene.update(step);
    expect(scene.draft.musicVolume).toBe(0);

    for (let i = 0; i < 21; i += 1) {
      press('right');
      scene.update(step);
    }
    expect(scene.draft.musicVolume).toBe(100);
    expect(setBusVolume).toHaveBeenLastCalledWith('music', 1);
  });

  it('adjusts sfx slider across every non-music bus', () => {
    const { audio, setBusVolume } = makeAudio();
    const { input, press } = makeInput();
    const scene = new SettingsScene({
      renderer,
      input,
      audio,
      settings: makeSettings({ sfxVolume: 50 }),
      onEvent: vi.fn(),
    });

    scene.enter();
    press('down');
    scene.update(step);
    press('right');
    scene.update(step);

    expect(scene.draft.sfxVolume).toBe(55);
    expect(setBusVolume).toHaveBeenCalledWith('sfx-attack', 0.55);
    expect(setBusVolume).toHaveBeenCalledWith('sfx-defense', 0.55);
    expect(setBusVolume).toHaveBeenCalledWith('sfx-world', 0.55);
    expect(setBusVolume).toHaveBeenCalledWith('ui', 0.55);
    expect(setBusVolume).toHaveBeenCalledWith('voice', 0.55);
  });

  it('Right on a toggle row flips bool', () => {
    const { input, press } = makeInput();
    const scene = new SettingsScene({
      renderer,
      input,
      audio: makeAudio().audio,
      settings: makeSettings(),
      onEvent: vi.fn(),
    });

    scene.enter();
    press('down');
    scene.update(step);
    press('down');
    scene.update(step);
    press('right');
    scene.update(step);

    expect(scene.draft.relaxedRhythm).toBe(true);
  });

  it('Confirm on Apply emits apply with updated SettingsV1', () => {
    const onEvent = vi.fn();
    const { input, press } = makeInput();
    const scene = new SettingsScene({
      renderer,
      input,
      audio: makeAudio().audio,
      settings: makeSettings(),
      onEvent,
    });

    scene.enter();
    press('right');
    scene.update(step);
    for (let i = 0; i < 5; i += 1) {
      press('down');
      scene.update(step);
    }
    press('confirm');
    scene.update(step);

    expect(onEvent).toHaveBeenCalledWith('apply', {
      musicVolume: 55,
      sfxVolume: 50,
      relaxedRhythm: false,
      highContrast: false,
      audioOnlyCues: false,
    });
  });

  it('Confirm on Back and Cancel emit cancel', () => {
    const onEvent = vi.fn();
    const { input, press } = makeInput();
    const scene = new SettingsScene({
      renderer,
      input,
      audio: makeAudio().audio,
      settings: makeSettings(),
      onEvent,
    });

    scene.enter();
    for (let i = 0; i < 6; i += 1) {
      press('down');
      scene.update(step);
    }
    press('confirm');
    scene.update(step);
    press('cancel');
    scene.update(step);

    expect(onEvent).toHaveBeenCalledWith('cancel');
    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('ignores input before enter and after exit', () => {
    const onEvent = vi.fn();
    const { input, press } = makeInput();
    const scene = new SettingsScene({
      renderer,
      input,
      audio: makeAudio().audio,
      settings: makeSettings(),
      onEvent,
    });

    press('right');
    scene.update(step);
    expect(scene.draft.musicVolume).toBe(50);

    scene.enter();
    scene.exit();
    press('right');
    scene.update(step);
    expect(scene.draft.musicVolume).toBe(50);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('handleInput is a no-op and exposes renderer', () => {
    const { input } = makeInput();
    const scene = new SettingsScene({
      renderer,
      input,
      audio: makeAudio().audio,
      settings: makeSettings(),
      onEvent: vi.fn(),
    });

    expect(scene.renderer).toBe(renderer);
    expect(() => {
      scene.handleInput(new Event('keydown'));
    }).not.toThrow();
  });
});

describe('SceneRouter settings transitions', () => {
  it('routes title -> settings on settings', () => {
    const router = new SceneRouter();

    router.transition('settings');

    expect(router.current()).toBe('settings');
  });

  it('routes settings -> title on apply or cancel', () => {
    const router = new SceneRouter();

    router.transition('settings');
    router.transition('apply');
    expect(router.current()).toBe('title');

    router.transition('settings');
    router.transition('cancel');
    expect(router.current()).toBe('title');
  });
});
