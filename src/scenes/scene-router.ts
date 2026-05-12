export type SceneId =
  | 'title'
  | 'save-select'
  | 'overworld'
  | 'battle'
  | 'game-over';

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

type RouterSceneId = SceneId | 'settings';

const TRANSITIONS: Readonly<Record<RouterSceneId, Partial<Record<RouterEvent, RouterSceneId>>>> =
  Object.freeze({
    title: { confirm: 'save-select', settings: 'settings' },
    'save-select': { confirm: 'overworld', cancel: 'title' },
    overworld: { encounter: 'battle' },
    battle: { victory: 'overworld', defeat: 'game-over' },
    'game-over': { confirm: 'title' },
    settings: { cancel: 'title', apply: 'title' },
  });

export class SceneRouter {
  #id: RouterSceneId = 'title';
  readonly #listeners: RouterChangeListener[] = [];

  current(): SceneId {
    return this.#id as SceneId;
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
      listener(from as SceneId, next as SceneId, event);
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
