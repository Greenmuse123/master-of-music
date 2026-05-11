# Master of Music

> *A 2D pixel-art action-RPG where musicians and instruments share a living world held together by sound itself — until The Discord shatters the Great Unison and one jazz saxophonist must reassemble it.*

**Status:** Pre-production. Documentation complete. Engine code = not yet written.
**Owner:** Elias Musleh (VegasBusinessAI)
**Created:** 2026-05-11

---

## What this directory is

This is a **pre-production package**: a complete game design, story, technical plan, asset-generation pipeline, and sub-agent orchestration plan. It is the briefing material for a fresh Claude Code session to execute. There is intentionally no engine code here yet.

Read in this order:

| # | Document | Purpose |
|---|----------|---------|
| — | [`README.md`](README.md) | This file |
| — | [`CLAUDE.md`](CLAUDE.md) | Project rules for any Claude session |
| 01 | [`docs/01-GAME_DESIGN_DOCUMENT.md`](docs/01-GAME_DESIGN_DOCUMENT.md) | Vision, pillars, scope, USP |
| 02 | [`docs/02-STORY_BIBLE.md`](docs/02-STORY_BIBLE.md) | World, characters, plot |
| 03 | [`docs/03-TECHNICAL_ARCHITECTURE.md`](docs/03-TECHNICAL_ARCHITECTURE.md) | Stack, engine design, file layout |
| 04 | [`docs/04-COMBAT_SYSTEM.md`](docs/04-COMBAT_SYSTEM.md) | Pokémon × Cuphead hybrid combat |
| 05 | [`docs/05-ASSET_PIPELINE.md`](docs/05-ASSET_PIPELINE.md) | Codex-driven asset generation |
| 06 | [`docs/06-SUBAGENT_ORCHESTRATION.md`](docs/06-SUBAGENT_ORCHESTRATION.md) | Agent roles + wave plan |
| 07 | [`docs/07-ROADMAP.md`](docs/07-ROADMAP.md) | Phases 0–6, MVP gate |
| 08 | [`docs/08-AUDIO_DESIGN.md`](docs/08-AUDIO_DESIGN.md) | Music as gameplay |
| — | [`codex-specs/`](codex-specs/) | Ready-to-run Codex specs |
| — | [`HANDOFF_PROMPT.md`](HANDOFF_PROMPT.md) | The prompt for the fresh Claude session |

---

## High-concept logline

> **Genre:** 2D pixel-art action-RPG with a Pokémon-style party system, Cuphead-style timed-action boss fights, and a rhythm layer that turns combat into improvised music.
> **Hook:** You are a saxophonist whose every move is a phrase, every battle a jam session, and every boss a rival genre trying to silence the world.

---

## Tech stack (one line)

`TypeScript` + `Vite` + `HTML5 Canvas 2D` (game) · `Howler.js` (audio) · `Vitest` (tests) · `IndexedDB` (saves) · `Tiled` (maps) · `JSON sprite atlases`

Full rationale in [`03-TECHNICAL_ARCHITECTURE.md`](docs/03-TECHNICAL_ARCHITECTURE.md).

---

## Codex's role in this project (important)

Codex (the ADR-003 CLI worker) **writes code, not images**. In this project Codex is responsible for:

1. Scaffolding the engine, modules, and tests (bounded specs).
2. Building the **asset generation pipeline** — image-gen API client, palette quantizer, sprite-sheet packer, atlas compiler, Tiled exporter validator.
3. Implementing combat, dialogue, save, and audio systems from specs.

The actual sprite *pixels* are produced by whatever generator the pipeline plugs into (AI image API → pixel-art post-process, or procedural, or hand-art import). [`05-ASSET_PIPELINE.md`](docs/05-ASSET_PIPELINE.md) presents three paths with a recommendation.

---

## How to start work (handoff)

Open a fresh Claude Code session in this directory and paste the contents of [`HANDOFF_PROMPT.md`](HANDOFF_PROMPT.md). That prompt is self-contained — it gives the fresh session everything it needs to read the docs in order, plan, and begin Phase 0.
