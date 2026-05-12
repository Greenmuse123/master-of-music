export const RENDER_LAYERS = ['bg', 'world', 'entities', 'fx', 'ui', 'debug'] as const;

export type RenderLayer = (typeof RENDER_LAYERS)[number];
