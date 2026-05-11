# Master of Music — Claude Code Project Instructions

> This file is auto-injected on session start when Claude runs from this directory. It pairs with the global `~/.claude/CLAUDE.md` (always-on) and the OS Brain `CLAUDE.md` (skill-first routing). Project-specific rules below take precedence inside this directory.

---

## What this project is

A 2D pixel-art action-RPG built with TypeScript + Vite + Canvas 2D. Pokémon × Cuphead × Jazz. See [`README.md`](README.md) for the high-concept logline and the full doc index.

This directory **is its own git repo** (per OS Brain `.gitignore`, `projects/` is excluded from the parent). Initialize with `git init` on first session.

---

## Mandatory reading order (every fresh session)

Before writing any code, read in order:

1. `docs/01-GAME_DESIGN_DOCUMENT.md` — vision, pillars, scope
2. `docs/03-TECHNICAL_ARCHITECTURE.md` — stack, file layout, contracts
3. `docs/06-SUBAGENT_ORCHESTRATION.md` — how to delegate this work
4. `docs/07-ROADMAP.md` — current phase + what's allowed in scope right now

Then read the docs relevant to your current task.

---

## Skill routing (project overrides)

In addition to the global routing table, the following are **first-class** here:

| Trigger | Skill |
|---------|-------|
| Any engine, rendering, sprite, tilemap, collision work | `pixel-game-engine` |
| Settings menu, options, accessibility, controls remapping | `game-settings` |
| Bounded 1–3 file mechanical work (rename, extract, scaffold, add-test) | `codex-delegate` |
| About to claim feature done | `superpowers:verification-before-completion` |
| Writing the implementation plan for a phase | `superpowers:writing-plans` |
| Executing a written plan | `superpowers:executing-plans` |
| Multi-agent parallel work | `superpowers:dispatching-parallel-agents` |

---

## Inviolable rules for this project

| Rule | Detail |
|------|--------|
| **No engine code without a plan.md** | Every phase's first artifact is a checked-in plan under `docs/plans/PHASE-<n>.md`. Implementation follows the plan; deviations require updating the plan first. |
| **No assets in git LFS until pipeline is real** | Until [`05-ASSET_PIPELINE.md`](docs/05-ASSET_PIPELINE.md) is implemented and producing valid outputs, do not commit binary art. Use placeholder rectangles. |
| **One spec per Codex delegation** | Use the templates in `codex-specs/`. Never paste ad-hoc prompts at Codex. Spec must include `goal`, `files[]`, `acceptance[]`, `verification[]`. |
| **Read the file before editing it** | Same global rule. Restate because game code is densely cross-referenced. |
| **Tests live next to code** | `foo.ts` → `foo.test.ts`. Vitest. Coverage gate: 70% lines on new modules. |
| **No new dependencies without a one-line ADR** | `docs/adr/ADR-<n>-<slug>.md` justifying the dep. Heavy frameworks (game engines, ECS libs) require explicit user approval. |
| **Pixel-perfect from day one** | Canvas `imageSmoothingEnabled = false`. All art at native pixel scale; upscale at the canvas-CSS layer only. |
| **Frame budget** | 60fps target; logic ≤8ms, render ≤8ms per frame on a 2020-era integrated GPU. |
| **Audio is gameplay, not decoration** | Per [`04-COMBAT_SYSTEM.md`](docs/04-COMBAT_SYSTEM.md), combat hooks the beat clock. Don't bolt audio on at the end. |
| **No emojis in code, docs, or commits** | Same global rule. |

---

## Conventions

- **Module layout:** `src/engine/`, `src/game/`, `src/scenes/`, `src/data/`, `src/audio/`, `src/ui/`, `src/save/`. See [`03-TECHNICAL_ARCHITECTURE.md`](docs/03-TECHNICAL_ARCHITECTURE.md) §4.
- **Naming:** kebab-case files, PascalCase classes, camelCase functions. Sprite atlases: `<actor>-<state>.png` + matching `.json`.
- **Commits:** Conventional (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `asset:`).
- **Branching:** `main` (protected), `feat/<phase>-<slug>`. PRs require green CI and one human review.
- **CI:** `npm run lint && npm run typecheck && npm run test && npm run build` on every PR.

---

## What NOT to do (project-specific anti-patterns)

- Do **not** import a heavy game framework (Phaser, PixiJS, Excalibur) without an ADR. The architecture is Canvas 2D first; a renderer swap is a deliberate later decision, not a first-day shortcut.
- Do **not** generate sprite art inside Claude or Codex by asking them to "draw" — they cannot. The pipeline is concrete and lives in [`05-ASSET_PIPELINE.md`](docs/05-ASSET_PIPELINE.md).
- Do **not** spawn more than 5 agents concurrently (OS Brain hard cap). Use the wave plan in [`06-SUBAGENT_ORCHESTRATION.md`](docs/06-SUBAGENT_ORCHESTRATION.md).
- Do **not** ship a "playable demo" until the [`07-ROADMAP.md`](docs/07-ROADMAP.md) MVP gate passes. Vertical slice first.
