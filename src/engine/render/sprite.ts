export type SpriteImage = CanvasImageSource;

export interface SpriteFrame {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export class Sprite {
  readonly frame: SpriteFrame;
  readonly image: SpriteImage;

  constructor(image: SpriteImage, frame: SpriteFrame) {
    this.image = image;
    this.frame = frame;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.drawImage(
      this.image,
      this.frame.x,
      this.frame.y,
      this.frame.w,
      this.frame.h,
      Math.round(x),
      Math.round(y),
      this.frame.w,
      this.frame.h,
    );
  }
}

export class SpriteSheet {
  readonly image: SpriteImage;
  readonly sprites = new Map<string, Sprite>();

  constructor(image: SpriteImage, frames: Readonly<Record<string, SpriteFrame>>) {
    this.image = image;

    for (const [name, frame] of Object.entries(frames)) {
      this.sprites.set(name, new Sprite(image, frame));
    }
  }

  get(name: string): Sprite {
    const sprite = this.sprites.get(name);

    if (sprite === undefined) {
      throw new Error(`Unknown sprite frame: ${name}`);
    }

    return sprite;
  }

  has(name: string): boolean {
    return this.sprites.has(name);
  }
}
