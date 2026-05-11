# 06 — Subagent Orchestration

**Project:** Master of Music
**Document version:** 1.0 (2026-05-11)

> This document defines the agent roles, their tool boundaries, and the *wave plan* for executing this project from the fresh session. It is the operating manual for the orchestrator (main Claude).

---

## 1. Operating model

**The fresh session is the orchestrator.** It does not write engine code directly; it plans, delegates, and verifies. Implementation flows through:

1. **Subagents** spawned via the `Agent` tool — used for parallel exploration, design, and review.
2. **Codex** invoked via `codex-delegate.cjs` — used for bounded mechanical implementation specs (1–3 files, mechanical verbs).
3. **The orchestrator itself** — owns planning, vision, ADRs, governance, ambiguity resolution, and code paths that touch ≥4 files or require cross-cutting decisions.

The orchestrator must respect:
- **Agent spawn cap = 5 concurrent** (OS Brain hard cap; see `~/.claude/CLAUDE.md`).
- **Skill-first routing** — always check `superpowers:writing-plans`, `superpowers:executing-plans`, `pixel-game-engine`, `codex-delegate` before delegation.
- **Verification-before-completion** at every wave boundary.

---

## 2. Agent roster

The full agent roster for this project. Spawn only the ones a given wave needs.

| Role | `subagent_type` | Purpose | Tools allowed |
|------|-----------------|---------|---------------|
| **Engine Architect** | `system-architect` | Designs engine modules, contracts, ADRs | Read, Glob, Grep, Write (docs only) |
| **Gameplay Engineer** | `sparc-coder` | Implements combat, overworld, UI scenes | All file tools, Bash for tests |
| **Asset Pipeline Engineer** | `backend-dev` | Builds the pipeline tooling (Codex-heavy) | All file tools, Bash, Codex delegation |
| **Narrative Designer** | `researcher` | Story content, dialogue JSON, lore consistency | Read, Write, Glob, Grep |
| **Audio Engineer** | `coder` | Howler integration, MusicClock, beat sync | All file tools, Bash |
| **UI/UX Designer** | `coder` (with `frontend-engineering` skill) | Menus, HUD, dialogue boxes, accessibility | All file tools |
| **QA / Tester** | `tester` | Vitest coverage, playthrough scripts, regression | Read, Write, Bash |
| **Reviewer** | `reviewer` | PR-quality review pass on each wave | Read, Glob, Grep |
| **Researcher** | `Explore` | Open-ended codebase search; lookups | Glob, Grep, Read, WebFetch |

**Hard rule:** No agent except the orchestrator and `Reviewer` reads documents outside its current task scope. Context discipline is the agent's primary discipline.

---

## 3. The wave plan

The project executes in **6 waves**. Each wave is a self-contained delivery with its own plan file under `docs/plans/PHASE-<n>.md` and a verification gate before the next wave starts.

### Wave 0 — Scaffold & guardrails

**Objective:** Project is a real, running, tested skeleton.

**Parallel agents (≤3):**
- `Engine Architect` → write `docs/plans/PHASE-0.md` + ADR-001 (Canvas2D).
- `Gameplay Engineer` (waits on Architect plan) → scaffold Vite + TS + Vitest + ESLint + Prettier.
- `Asset Pipeline Engineer` → scaffold `tools/asset-pipeline/` (empty stubs, package.json scripts).

**Codex delegations (sequential):**
- `codex-specs/01-scaffold-engine.json` — initial Vite/TS project with one `Game` boot.
- `codex-specs/02-asset-pipeline-scaffold.json` — pipeline scaffold + lint.
- `codex-specs/03-ci-workflow.json` — GitHub Actions CI.

**Exit gate:**
- `npm run lint && npm run typecheck && npm run test && npm run build` all green locally.
- CI green on `main`.
- `docs/plans/PHASE-0.md` exists and is checked in.

### Wave 1 — Vertical slice (one room, one battle)

**Objective:** Playable: title → save → one room (3×3 tile-grid) → one battle (1v1) → game-over.

**Parallel agents (≤4):**
- `Gameplay Engineer (combat)` → `engine/render` + battle-scene skeleton.
- `Gameplay Engineer (overworld)` → overworld-scene + player controller.
- `Audio Engineer` → MusicClock + Howler facade + 1 placeholder track.
- `UI/UX Designer` → title screen + main menu + textbox.

**Codex delegations (parallel where independent):**
- `04-renderer-core.json`, `05-input-manager.json`, `06-music-clock.json`, `07-textbox-widget.json`.

**Exit gate:**
- Player can complete the title→room→battle→game-over loop on a clean install.
- 60fps on a 2020-era laptop.
- 70% unit coverage on `engine/` and `game/combat/`.

### Wave 2 — Combat depth & first content

**Objective:** Full rhythm-combat with 3 party members, type table, 1 boss.

**Parallel agents (≤5):**
- `Gameplay Engineer (combat)` → full rhythm windows, parry, dissonance.
- `Gameplay Engineer (content)` → 3 party movesets + 8 enemy types.
- `Narrative Designer` → first town dialogue + boss script.
- `Audio Engineer` → combat-jazz dynamic stems + boss theme.
- `QA / Tester` → vitest coverage on combat math; playthrough scripts.

**Codex delegations (batched):**
- `08-rhythm-window.json`, `09-type-table.json`, `10-parry.json`, `11-dissonance-meter.json`, `12-boss-phases.json`.

**Exit gate:**
- A scripted full battle (record/replay) passes deterministically.
- Boss fight feels Cuphead-grade (manual subjective gate; orchestrator + user sign-off).

### Wave 3 — World expansion: Jazz City + Bayou

**Objective:** Two regions, 4 hours of content, recruitment system live.

**Parallel agents (≤5):**
- `Narrative Designer` → side-quests, NPCs, recruitment dialogue.
- `Gameplay Engineer` → recruitment mechanic, save expansion.
- `Asset Pipeline Engineer` → Tier-1 asset generation for tilesets.
- `UI/UX Designer` → menus polish, settings menu with accessibility.
- `Audio Engineer` → bayou theme + dynamic transitions.

**Codex delegations:**
- `13-recruitment.json`, `14-tilemap-renderer.json`, `15-settings-menu.json`, `16-dialogue-runner.json`.

**Exit gate:**
- New playtester can complete both regions without external help.
- Save/load roundtrip preserves all flags through both regions.
- Asset pipeline produces approved Tier-1 art in <5 minutes per batch.

### Wave 4 — Asset pipeline maturity & content scaling

**Objective:** Pipeline can produce a region's worth of assets in a day with one human approver.

**Parallel agents (≤3):**
- `Asset Pipeline Engineer` → batch generation, ref-image conditioning, provenance log.
- `QA / Tester` → asset validator coverage; CI gate on assets.
- `Reviewer` → end-of-wave code review.

**Codex delegations:** `17-batch-generator.json`, `18-provenance.json`, `19-asset-ci-gate.json`.

**Exit gate:**
- 50 NPCs generated, validated, approved, packed in one day.
- Asset validator failure rate < 5%.

### Wave 5 — Remaining content & polish

**Objective:** Full game playable end-to-end, even if rough in places.

**Parallel agents (≤5):**
- `Narrative Designer` → Acts II + III dialogue and quests.
- `Gameplay Engineer (combat)` → remaining Quartet boss encounters.
- `Gameplay Engineer (systems)` → ending branches, multi-ending state machine.
- `Audio Engineer` → all remaining themes + dynamic transitions.
- `Asset Pipeline Engineer` → final-art passes on hero sprites (Path C).

### Wave 6 — Beta, accessibility, ship

**Objective:** Public beta on itch.io, accessibility audit complete, success-criteria measured.

**Parallel agents (≤4):**
- `QA / Tester` → full regression, accessibility audit, performance audit.
- `Reviewer` → final code review.
- `UI/UX Designer` → accessibility polish (high contrast, audio-only mode).
- `Gameplay Engineer` → ending polish + final boss sequence.

**Exit gate:**
- Itch.io page live.
- 10 external playtesters confirm MVP success criteria.

---

## 4. Codex delegation pattern

Every Codex spec must be:

- **Bounded:** ≤3 files, mechanical verb, named acceptance.
- **Verifiable:** `verification[]` is a real script — typecheck, tests, build, or assert.
- **Stand-alone:** the spec is enough; the worker should not need to ask questions.

Bad spec: *"implement combat."*
Good spec: *"add `src/game/combat/rhythm-window.ts` exporting `evaluateRhythmHit(now, target, focus): RhythmQuality` per docs/04-COMBAT_SYSTEM §3.3, with vitest coverage of all five quality bands."*

Specs are saved under `codex-specs/` and invoked via:

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/<NN-name>.json
```

The orchestrator never inline-prompts Codex. **All Codex work goes through specs.**

---

## 5. Anti-patterns (do not do these)

| Anti-pattern | Why it's wrong |
|--------------|----------------|
| Spawning 8 agents at once | Hard cap is 5. Anything more is fail-fast. |
| Delegating "design the combat system" to a subagent | Design is the orchestrator's job. Subagents implement, not decide. |
| Asking Codex to "draw a sprite" | Codex doesn't draw. See [`05-ASSET_PIPELINE.md`](05-ASSET_PIPELINE.md). |
| Skipping plan files | Every wave needs `docs/plans/PHASE-<n>.md`. No exceptions. |
| Asking a subagent to read the whole repo for context | Context discipline. Tell agents exactly which files to read. |
| Letting a wave drift past its exit gate | Gates exist; meeting them is the point. |
| Reviewer rubber-stamping | Reviewer has authority to reject. Re-run the wave if rejected. |

---

## 6. Quick-reference: when to spawn vs. when to do it yourself

| Situation | Action |
|-----------|--------|
| 1 file, ≤20 lines | Orchestrator does it directly |
| 1–3 files, mechanical verb, can scope without exploration | Codex spec |
| 1 file, requires exploration of 5+ unknown files | Orchestrator does it directly |
| 4+ files OR cross-cutting | Subagent (`sparc-coder` or domain coder) |
| Open-ended question / research | `Explore` subagent |
| Final review on a wave | `Reviewer` subagent |
| Decision about architecture, ADR, design | **Orchestrator only.** Never delegate. |
| User-facing design tradeoff | **Orchestrator only.** Surface to user. |

---

## 7. Handoff between waves

At every wave boundary the orchestrator:

1. Runs the wave's exit gate (lint, typecheck, test, build, manual smoke).
2. Writes `docs/audits/wave-<n>-closure.md` summarizing what shipped, what didn't, what carried forward.
3. Updates `HEARTBEAT.md` (if/when project-level heartbeat is added; for V1 a short closure doc is enough).
4. Tags the commit `wave-<n>-complete`.
5. Opens the next wave's plan file.

No silent gate-jumping.
