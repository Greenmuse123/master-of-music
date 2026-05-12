export type SceneId =
  | 'title'
  | 'save-select'
  | 'overworld'
  | 'battle'
  | 'game-over'
  | 'settings';

export type RouterEvent =
  | 'confirm'
  | 'cancel'
  | 'encounter'
  | 'victory'
  | 'defeat'
  | 'settings'
  | 'apply';

export type RouterChangeListener = (
  from: SceneId,
  to: SceneId,
  event: RouterEvent,
) => void;

const TRANSITIONS: Readonly<Record<SceneId, Partial<Record<RouterEvent, SceneId>>>> =
  Object.freeze({
    title: { confirm: 'save-select', settings: 'settings' },
    'save-select': { confirm: 'overworld', cancel: 'title' },
    overworld: { encounter: 'battle' },
    battle: { victory: 'overworld', defeat: 'game-over' },
    'game-over': { confirm: 'title' },
    settings: { cancel: 'title', apply: 'title' },
  });

export class SceneRouter {
  #id: SceneId = 'title';
  readonly #listeners: RouterChangeListener[] = [];

  current(): SceneId {
    return this.#id;
  }

  transition(event: RouterEvent): void {
    const map = TRANSITIONS[this.#id];
    const next = map[event];
    if (next === undefined) {
      return;
    }
    const from = this.#id;
    this.#id = next;
    for (const listener of this.#listeners) {
      listener(from, next, event);
    }
  }

  onChange(listener: RouterChangeListener): () => void {
    this.#listeners.push(listener);
    return () => {
      const idx = this.#listeners.indexOf(listener);
      if (idx >= 0) {
        this.#listeners.splice(idx, 1);
      }
    };
  }
}
