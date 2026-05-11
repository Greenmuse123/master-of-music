# 03 — Technical Architecture

**Project:** Master of Music
**Document version:** 1.0 (2026-05-11)

---

## 1. Stack decision (locked, with ADR placeholders)

| Layer | Choice | Why this, not the alternative |
|-------|--------|-------------------------------|
| Language | **TypeScript 5.x (strict)** | Static safety on a deeply-coupled state machine. Alt: plain JS — rejected, refactoring cost too high. |
| Build / dev server | **Vite 5.x** | Fastest HMR for game-loop iteration. Alt: Webpack — rejected, slower DX. |
| Renderer | **HTML5 Canvas 2D**, native browser | Sufficient for 480×270 pixel art; portable; no WebGL fallback complexity. Alt: PixiJS / WebGL — deferred until profiling proves it necessary (see [ADR-001](adr/ADR-001-canvas2d-renderer.md), to be authored in Phase 0). |
| Audio | **Howler.js 2.x** | Sample-accurate timing, sprite map support, mobile-safe unlock. Alt: Web Audio API direct — possible later if scheduler needs sub-frame precision; spike in Phase 2. |
| Tilemap editor | **Tiled** (external) → JSON | De-facto standard, free, scriptable. |
| Atlas packer | Custom Codex-built script (sprite packer) | Light dep cost vs. TexturePacker license. |
| Save / persistence | **IndexedDB** via thin wrapper | Async, large quota, structured cloning. |
| Tests | **Vitest** | Native Vite integration. Coverage: V8 provider. |
| Lint / format | **ESLint** + **Prettier**, with `eslint-plugin-perfectionist` for import order | Standard. |
| Type checking | `tsc --noEmit` in CI | Strict mode required. |
| CI | **GitHub Actions** | Free for the project's size. |
| E2E (optional) | **Playwright** for menu-screen smoke tests only | Combat is not E2E-tested; covered by unit tests of pure logic. |

**Adding a new dependency requires an ADR** (see [`CLAUDE.md`](../CLAUDE.md) inviolable rules).

---

## 2. Runtime model

The game is one HTML page, one canvas element, one `requestAnimationFrame` loop:

```
┌──────────────────────────────────────────────────────────────┐
│  index.html  ←  <canvas id="game" width=480 height=270>      │
│                CSS pixel-scale up to 1920×1080 (4x).         │
└───────────────────────────┬──────────────────────────────────┘
                            │
                ┌───────────▼────────────┐
                │   src/main.ts          │  bootstrap, error boundary
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │   Game (engine root)   │  owns: time, input, audio,
                │                        │  scene stack, save, settings
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │   Scene stack          │  Title / Overworld / Battle /
                │                        │  Menu / Cutscene / GameOver
                └────────────────────────┘
```

### 2.1 Frame contract

```ts
type FrameStep = {
  dt: number;        // seconds since last frame, clamped [0, 0.05]
  now: number;       // ms since game start
  beat: number;      // current beat index (from MusicClock; null outside battle)
  beatPhase: number; // [0,1) where in the beat we are
};

interface Scene {
  enter(prev?: Scene): void;
  exit(next?: Scene): void;
  update(step: FrameStep): void;
  render(ctx: CanvasRenderingContext2D): void;
  handleInput(e: InputEvent): void;
}
```

**Inviolable:** `update` may not allocate during steady-state gameplay. All allocations in `enter`. Use object pools for projectiles and damage numbers.

### 2.2 Time and rhythm

- **Logical time** is driven by `performance.now()`.
- **Musical time** (`MusicClock`) is driven by Howler's audio clock when music is playing; falls back to logical time when not. This is the **single source of truth for combat rhythm windows**.
- Drift correction: re-anchor `MusicClock` to Howler position every 250ms.

---

## 3. Module map

```
src/
├── main.ts                       # entry, error boundary, mounts <Game>
├── game.ts                       # Game root: time, input, audio, scenes, save, settings
├── config/
│   ├── constants.ts              # RENDER_W, RENDER_H, FRAME_MS, etc.
│   ├── flags.ts                  # debug flags (read-only in prod)
│   └── version.ts
├── engine/
│   ├── input/
│   │   ├── input-manager.ts      # keyboard + gamepad, action mapping
│   │   └── remap.ts
│   ├── render/
│   │   ├── renderer.ts           # ctx wrapper, layered draw order
│   │   ├── sprite.ts             # Sprite + SpriteSheet
│   │   ├── atlas.ts              # JSON atlas loader
│   │   ├── animation.ts          # AnimationPlayer
│   │   ├── camera.ts
│   │   └── tilemap.ts            # Tiled JSON renderer
│   ├── audio/
│   │   ├── audio-manager.ts      # Howler facade
│   │   ├── music-clock.ts        # beat + phase
│   │   └── sfx-pool.ts
│   ├── scene/
│   │   ├── scene.ts              # interface
│   │   └── scene-stack.ts
│   ├── ecs/                      # minimal entity-component-system (if needed; see §5)
│   ├── physics/
│   │   ├── aabb.ts
│   │   └── grid-collider.ts
│   ├── save/
│   │   ├── store.ts              # IndexedDB wrapper
│   │   ├── slots.ts
│   │   └── schema.ts             # zod-validated save shape
│   └── settings/
│       ├── settings.ts
│       └── persistence.ts
├── game/
│   ├── combat/
│   │   ├── battle-scene.ts
│   │   ├── action-resolver.ts
│   │   ├── rhythm-window.ts
│   │   ├── type-table.ts
│   │   ├── ai.ts
│   │   └── damage.ts
│   ├── overworld/
│   │   ├── overworld-scene.ts
│   │   ├── player-controller.ts
│   │   ├── npc.ts
│   │   └── interactable.ts
│   ├── dialogue/
│   │   ├── dialogue-runner.ts
│   │   ├── parser.ts
│   │   └── portrait.ts
│   ├── party/
│   │   ├── party.ts
│   │   ├── instrument.ts         # character data class
│   │   └── moves.ts
│   ├── progression/
│   │   ├── quest-flags.ts
│   │   └── recruitment.ts
│   └── content/                  # static data (see §6)
├── scenes/                       # screen-level glue
│   ├── title-scene.ts
│   ├── menu-scene.ts
│   ├── cutscene-scene.ts
│   └── game-over-scene.ts
├── ui/
│   ├── widget.ts
│   ├── textbox.ts
│   ├── healthbar.ts
│   └── menu.ts
├── data/                         # JSON content (see §6)
│   ├── moves/
│   ├── instruments/
│   ├── enemies/
│   ├── maps/
│   └── dialogue/
└── assets/                       # binary art / audio (see §7)
    ├── sprites/
    ├── tilesets/
    ├── music/
    └── sfx/

tests/                            # mirrors src/ where logic is non-trivial
public/                           # static, served as-is by Vite
```

Every module has a sibling `.test.ts` if it contains logic. Pure data files do not require tests.

---

## 4. Cross-cutting contracts

### 4.1 Save schema (versioned)

```ts
interface SaveV1 {
  v: 1;
  slot: 0 | 1 | 2;
  createdAt: string;     // ISO
  updatedAt: string;
  playtimeSec: number;
  player: { x: number; y: number; mapId: string; facing: 'n'|'s'|'e'|'w' };
  party: Array<{ id: string; level: number; xp: number; moves: string[] }>;
  flags: Record<string, boolean | number>;
  inventory: Record<string, number>;
  settings: SettingsV1;
}
```

Migration: every schema bump ships a `migrations/N-to-N+1.ts` function. Loader runs all pending migrations top-to-bottom. **No save-data deletion as a migration shortcut.**

### 4.2 Input action map

Logical actions, not keys: `up | down | left | right | confirm | cancel | menu | act-1 | act-2 | act-3 | act-4 | beat-press`. Keys mapped via `engine/input/remap.ts`. Default: WASD + JKLI + Space (beat) + Enter (confirm) + Esc (cancel).

### 4.3 Asset loader contract

Every asset has a manifest entry. Loader streams in priority order: UI > current-scene > next-likely-scene. **No on-demand `fetch` during gameplay.** See [`05-ASSET_PIPELINE.md`](05-ASSET_PIPELINE.md) §4.

### 4.4 Random number generation

Deterministic PRNG (`mulberry32`) seeded per save. Combat RNG is reproducible for replay/debug. **No `Math.random()` in game logic** — lint rule enforces.

---

## 5. ECS or not?

**Decision: not yet.** The MVP entity count (≤30 active entities, ≤6 party, ≤8 enemies, ≤16 projectiles) does not justify an ECS. Use plain classes with composition.

Re-evaluate at Phase 3 when the overworld grows. If we cross 200 active entities or animations stutter, introduce a minimal sparse-set ECS (`bitecs` is the prospective dep). This decision will be recorded as an ADR if/when triggered.

---

## 6. Content data format

All static content is JSON (or YAML compiled to JSON at build time). Schema-validated via **zod** at boot in dev mode, skipped in prod.

Example move:

```json
{
  "id": "blue-note-bend",
  "displayName": "Blue Note Bend",
  "genre": "blues",
  "ownerType": "instrument",
  "ownerIds": ["upright-bass"],
  "cost": { "resonance": 12 },
  "power": 30,
  "rhythm": { "windows": [{ "phase": 0.5, "tolerance": 0.08, "label": "perfect" }] },
  "effect": { "type": "damage", "scaling": "RESONANCE", "element": "blues" },
  "vfx": "blue-bend",
  "sfx": "bend-low-1",
  "narrativeText": "Pete bends a low E into a question."
}
```

---

## 7. Asset format (see also: 05-ASSET_PIPELINE.md)

- **Sprites:** PNG, indexed-color preferred, transparency on. Paired with `.atlas.json` describing frames + animations.
- **Tilesets:** PNG + Tiled `.tsx` (then exported to `.tileset.json` by a build step).
- **Maps:** Tiled `.tmx` → exported `.map.json`.
- **Music:** OGG (primary) + MP3 (Safari fallback). 44.1kHz, stereo, ≤256kbps.
- **SFX:** OGG, mono, 22.05kHz, peak-normalized to -3dBFS.
- **Fonts:** Pixel font as bitmap atlas (`assets/sprites/fonts/`) — no webfonts to avoid sub-pixel rendering.

---

## 8. Testing strategy

| Layer | Tool | Coverage target |
|-------|------|-----------------|
| Pure logic (damage, type table, rhythm window) | Vitest | 90% |
| Engine modules (input mapper, animation player) | Vitest | 70% |
| Scenes (battle, overworld) | Vitest + headless canvas mock | 50% (smoke + edge cases) |
| Menu / save / settings | Playwright | golden-path only |
| Performance | Vitest perf benchmarks for the frame budget | n/a, asserts ≤16ms |

**CI gate:** lint + typecheck + test + build must all pass. Phase 0 ships the GitHub Actions workflow.

---

## 9. Performance budget

- **Logic:** ≤8ms/frame.
- **Render:** ≤8ms/frame.
- **Memory:** ≤150MB resident on a steady-state battle; ≤300MB peak with audio decoded.
- **Initial load:** ≤8MB compressed for the title scene; rest streamed.
- **Profiling:** Built-in F2 = perf overlay (frame time, draw calls, allocations).

---

## 10. Deployment

- Dev: `vite dev`
- Build: `vite build` → `dist/`
- Preview: `vite preview`
- Distribution V1: itch.io static upload (`dist/` zipped)
- Distribution V2: Tauri wrapper for Steam — separate decision, post-MVP.

---

## 11. Open technical questions (route to Phase 0 ADRs)

1. **Canvas2D vs. PixiJS WebGL.** Profile a worst-case battle in Phase 1; switch if frame budget unmet.
2. **Audio engine.** Howler vs. raw Web Audio + scheduler. Spike in Phase 2 only if rhythm windows feel sloppy.
3. **State management.** Implicit (current plan, scene-owned state) vs. a tiny store (e.g., `zustand`). Default: implicit. Reconsider if Act II reveals state-sharing pain.
4. **Save backups.** Auto-export to localStorage shadow copy per slot. Decide in Phase 2 (saves are not at-risk until then).
