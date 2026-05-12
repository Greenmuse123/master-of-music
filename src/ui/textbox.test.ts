import { describe, expect, it, vi } from 'vitest';

import { Textbox } from './textbox';

function stubCanvas(): CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
} {
  const ctx = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  return ctx as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
  };
}

function renderedText(ctx: { fillText: ReturnType<typeof vi.fn> }): string[] {
  return ctx.fillText.mock.calls.map((call) => call[0] as string);
}

describe('Textbox', () => {
  it('reveals one character per configured character interval within 1ms tolerance', () => {
    const ctx = stubCanvas();
    const textbox = new Textbox({ charsPerSec: 10, text: 'abc' });

    textbox.update(0.099);
    textbox.render(ctx);
    expect(renderedText(ctx)).toEqual([]);

    textbox.update(0.001);
    textbox.render(ctx);
    expect(renderedText(ctx)).toContain('a');

    ctx.fillText.mockClear();
    textbox.update(0.1);
    textbox.render(ctx);
    expect(renderedText(ctx)).toContain('ab');
  });

  it('settles into idle when update reveals the full text', () => {
    const textbox = new Textbox({ charsPerSec: 4, text: 'abcd' });

    textbox.update(1);

    expect(textbox.confirm()).toBe('advance');
  });

  it('ignores invalid update deltas while typing', () => {
    const ctx = stubCanvas();
    const textbox = new Textbox({ text: 'bad delta' });

    textbox.update(Number.NaN);
    textbox.update(0);
    textbox.update(-1);
    textbox.render(ctx);

    expect(renderedText(ctx)).toEqual([]);
  });

  it('fast-forwards mid-typing and advances once idle', () => {
    const textbox = new Textbox({ charsPerSec: 1, text: 'solo' });

    expect(textbox.confirm()).toBe('fast-forward');
    expect(textbox.isDone()).toBe(false);
    expect(textbox.confirm()).toBe('advance');
    expect(textbox.isDone()).toBe(true);
    expect(textbox.confirm()).toBe('noop');
  });

  it('renders the panel background and typed substring', () => {
    const ctx = stubCanvas();
    const textbox = new Textbox({ charsPerSec: 30, text: 'hello world' });

    textbox.update(5 / 30);
    textbox.render(ctx);

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 190, 480, 80);
    expect(ctx.fillRect).toHaveBeenCalledWith(4, 194, 472, 72);
    expect(ctx.fillText).toHaveBeenCalledWith('hello', 8, 198);
  });

  it('draws an optional portrait slot and shifts text into the remaining rect', () => {
    const ctx = stubCanvas();
    const portrait = document.createElement('img');
    const textbox = new Textbox({ portrait, text: 'brass' });

    textbox.confirm();
    textbox.render(ctx);

    expect(ctx.drawImage).toHaveBeenCalledWith(portrait, 8, 198, 64, 64);
    expect(ctx.fillText).toHaveBeenCalledWith('brass', 76, 198);
  });

  it('wraps space-separated words across visible lines without breaking mid-word', () => {
    const ctx = stubCanvas();
    const words = Array.from({ length: 80 }, () => 'abcde');
    const textbox = new Textbox({ text: `${words.join(' ')} ` });

    textbox.confirm();
    textbox.render(ctx);

    const lines = renderedText(ctx);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.split(' ').every((word) => word === 'abcde')).toBe(true);
    }
  });

  it('breaks a word by character when it exceeds the line width', () => {
    const ctx = stubCanvas();
    const textbox = new Textbox({ text: 'x'.repeat(100) });

    textbox.confirm();
    textbox.render(ctx);

    expect(renderedText(ctx)).toEqual(['x'.repeat(77), 'x'.repeat(23)]);
  });

  it('flushes the current line before breaking an oversized word', () => {
    const ctx = stubCanvas();
    const textbox = new Textbox({ text: `lead ${'x'.repeat(80)}` });

    textbox.confirm();
    textbox.render(ctx);

    expect(renderedText(ctx)).toEqual(['lead', 'x'.repeat(77), 'x'.repeat(3)]);
  });

  it('defaults empty text to idle and ignores invalid update deltas outside typing', () => {
    const textbox = new Textbox({ text: '' });

    textbox.update(Number.NaN);

    expect(textbox.confirm()).toBe('advance');
    expect(textbox.isDone()).toBe(true);
  });

  it('validates positive character speed', () => {
    expect(() => new Textbox({ charsPerSec: 0, text: 'bad' })).toThrow(
      'Textbox charsPerSec must be positive.',
    );
    expect(() => new Textbox({ charsPerSec: Number.POSITIVE_INFINITY, text: 'bad' })).toThrow(
      'Textbox charsPerSec must be positive.',
    );
  });
});
