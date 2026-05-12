import { RENDER_H, RENDER_W } from '../../config/constants';

export interface CameraTarget {
  readonly x: number;
  readonly y: number;
}

export interface DeadZone {
  readonly h: number;
  readonly w: number;
}

export interface ShakeOptions {
  readonly amplitude: number;
  readonly duration: number;
  readonly frequency: number;
}

export class Camera {
  x = 0;
  y = 0;
  #deadZone?: DeadZone;
  #shakeAmplitude = 0;
  #shakeDuration = 0;
  #shakeElapsed = 0;
  #shakeFrequency = 0;
  #shakeOffsetX = 0;
  #shakeOffsetY = 0;

  constructor(x = 0, y = 0, deadZone?: DeadZone) {
    this.x = x;
    this.y = y;
    this.#deadZone = deadZone;
  }

  get renderX(): number {
    return Math.round(this.x + this.#shakeOffsetX);
  }

  get renderY(): number {
    return Math.round(this.y + this.#shakeOffsetY);
  }

  get shakeAmplitude(): number {
    return this.#shakeAmplitude;
  }

  follow(target: CameraTarget): void {
    if (this.#deadZone === undefined) {
      this.centerOn(target);
      return;
    }

    const zoneLeft = this.x + (RENDER_W - this.#deadZone.w) / 2;
    const zoneRight = zoneLeft + this.#deadZone.w;
    const zoneTop = this.y + (RENDER_H - this.#deadZone.h) / 2;
    const zoneBottom = zoneTop + this.#deadZone.h;

    if (target.x < zoneLeft) {
      this.x -= zoneLeft - target.x;
    } else if (target.x > zoneRight) {
      this.x += target.x - zoneRight;
    }

    if (target.y < zoneTop) {
      this.y -= zoneTop - target.y;
    } else if (target.y > zoneBottom) {
      this.y += target.y - zoneBottom;
    }

    this.snap();
  }

  screenToWorld(x: number, y: number): CameraTarget {
    return {
      x: Math.round(x + this.renderX),
      y: Math.round(y + this.renderY),
    };
  }

  shake(options: ShakeOptions): void {
    if (options.duration <= 0 || options.amplitude <= 0 || options.frequency <= 0) {
      this.#shakeAmplitude = 0;
      this.#shakeDuration = 0;
      this.#shakeElapsed = 0;
      this.#shakeFrequency = 0;
      this.#shakeOffsetX = 0;
      this.#shakeOffsetY = 0;
      return;
    }

    this.#shakeAmplitude = options.amplitude;
    this.#shakeDuration = options.duration;
    this.#shakeElapsed = 0;
    this.#shakeFrequency = options.frequency;
  }

  tick(seconds: number): void {
    if (seconds < 0) {
      throw new Error('Camera tick seconds must be non-negative.');
    }

    if (this.#shakeDuration === 0) {
      return;
    }

    this.#shakeElapsed = Math.min(this.#shakeElapsed + seconds, this.#shakeDuration);

    const progress = this.#shakeElapsed / this.#shakeDuration;
    const envelope = Math.max(0, 1 - progress);
    this.#shakeAmplitude *= envelope;

    const phase = this.#shakeElapsed * this.#shakeFrequency * Math.PI * 2;
    this.#shakeOffsetX = Math.sin(phase) * this.#shakeAmplitude;
    this.#shakeOffsetY = Math.cos(phase) * this.#shakeAmplitude;

    if (this.#shakeElapsed >= this.#shakeDuration || this.#shakeAmplitude < 0.1) {
      this.#shakeAmplitude = 0;
      this.#shakeDuration = 0;
      this.#shakeOffsetX = 0;
      this.#shakeOffsetY = 0;
    }
  }

  worldToScreen(x: number, y: number): CameraTarget {
    return {
      x: Math.round(x - this.renderX),
      y: Math.round(y - this.renderY),
    };
  }

  private centerOn(target: CameraTarget): void {
    this.x = target.x - RENDER_W / 2;
    this.y = target.y - RENDER_H / 2;
    this.snap();
  }

  private snap(): void {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
  }
}
