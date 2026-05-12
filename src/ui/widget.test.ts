import { describe, expect, it, vi } from 'vitest';

import type { Widget } from './widget';

describe('Widget', () => {
  it('accepts a minimal update and render implementation', () => {
    const render = vi.fn();
    const update = vi.fn();
    const widget: Widget = {
      render,
      update,
    };
    const ctx = {} as CanvasRenderingContext2D;

    widget.update(1 / 60);
    widget.render(ctx);

    expect(update).toHaveBeenCalledWith(1 / 60);
    expect(render).toHaveBeenCalledWith(ctx);
  });
});
