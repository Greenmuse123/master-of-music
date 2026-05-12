import { describe, expect, it } from 'vitest';

import { RENDER_H, RENDER_W } from '../../config/constants';
import { Camera } from './camera';

describe('Camera', () => {
  it('centers on a target when no dead-zone is configured', () => {
    const camera = new Camera();

    camera.follow({ x: 300.4, y: 200.6 });

    expect(camera.x).toBe(Math.round(300.4 - RENDER_W / 2));
    expect(camera.y).toBe(Math.round(200.6 - RENDER_H / 2));
  });

  it('moves only when a target exits the dead-zone', () => {
    const camera = new Camera(0, 0, { h: 50, w: 100 });

    camera.follow({ x: RENDER_W / 2, y: RENDER_H / 2 });
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);

    camera.follow({ x: 400, y: 240 });
    expect(camera.x).toBe(110);
    expect(camera.y).toBe(80);

    camera.follow({ x: 100, y: 60 });
    expect(camera.x).toBe(-90);
    expect(camera.y).toBe(-50);
  });

  it('converts between world and screen coordinates with snapped camera position', () => {
    const camera = new Camera(10.4, 20.6);

    expect(camera.renderX).toBe(10);
    expect(camera.renderY).toBe(21);
    expect(camera.worldToScreen(15.2, 30.7)).toEqual({ x: 5, y: 10 });
    expect(camera.screenToWorld(5.2, 9.7)).toEqual({ x: 15, y: 31 });
  });

  it('applies frequency-based shake and decays below 0.1 within duration', () => {
    const camera = new Camera();

    camera.shake({ amplitude: 8, duration: 1, frequency: 8 });
    camera.tick(0.25);

    expect(camera.shakeAmplitude).toBeGreaterThan(0);

    camera.tick(0.75);

    expect(camera.shakeAmplitude).toBeLessThan(0.1);
    expect(camera.renderX).toBe(0);
    expect(camera.renderY).toBe(0);
  });

  it('resets invalid shake requests and ignores idle ticks', () => {
    const camera = new Camera();

    camera.shake({ amplitude: 0, duration: 1, frequency: 1 });
    camera.tick(1);

    expect(camera.shakeAmplitude).toBe(0);
  });

  it('rejects negative tick input', () => {
    expect(() => new Camera().tick(-0.01)).toThrow('Camera tick seconds must be non-negative.');
  });
});
