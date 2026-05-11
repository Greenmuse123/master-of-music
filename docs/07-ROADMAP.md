# 07 — Roadmap

**Project:** Master of Music
**Document version:** 1.0 (2026-05-11)

> Phases map 1:1 to the waves in [`06-SUBAGENT_ORCHESTRATION.md`](06-SUBAGENT_ORCHESTRATION.md). Time estimates assume one orchestrator session + agents/Codex doing the work. All estimates are *budgets*, not promises — drift is recorded in wave closures.

---

## Phase 0 — Scaffold & guardrails

**Budget:** ~1 working day of session time.
**Deliverable:** Empty Vite/TS/Canvas project, lint+typecheck+test+build green, CI on, asset pipeline directory exists.
**Gate:**
- All scripts green.
- `docs/plans/PHASE-0.md` checked in.
- ADR-001 (Canvas2D over WebGL) checked in.

## Phase 1 — Vertical slice

**Budget:** 2–3 sessions.
**Deliverable:** Title → save select → one tiny room → one 1v1 battle → game-over screen → return to title. Placeholder art. One placeholder music track.
**Gate:**
- End-to-end playable on a fresh clone.
- 60fps on a 2020-era integrated GPU.
- Battle rhythm cues visibly land.
- Unit coverage ≥70% on `engine/` and `game/combat/`.

## Phase 2 — Combat depth & first boss

**Budget:** 3–4 sessions.
**Deliverable:** Full rhythm-combat with 3 party members, type table, parry, dissonance, recruitment, **one Cuphead-grade boss fight** (Diminuendo).
**Gate:**
- Boss fight has ≥3 phases.
- 8 enemy types, 24 moves implemented.
- Replay test (record + replay) deterministic.
- Manual subjective sign-off on boss feel.

## Phase 3 — World expansion (Jazz City + Bayou)

**Budget:** 4–6 sessions.
**Deliverable:** Two full regions, full overworld, recruitment system, settings menu with accessibility, save/load across regions, 4+ hours of content.
**Gate:**
- External playtester completes both regions blind.
- All accessibility toggles work.

## Phase 4 — Asset pipeline maturity

**Budget:** 2–3 sessions.
**Deliverable:** Pipeline runs batch generations with ≤5% validator failures; reference-image conditioning; provenance log; CI gates assets.
**Gate:**
- 50-NPC batch generated, validated, packed in one day.
- All Tier-1 art for Phases 1–3 retroactively re-runs from job specs.

## Phase 5 — Remaining content + endings

**Budget:** 8–12 sessions.
**Deliverable:** Acts II + III content, remaining Quartet bosses, three endings, Cacophony final encounter, all 7 regions traversable.
**Gate:**
- Full storyline playable.
- Three endings reachable from one save by replay.

## Phase 6 — Beta, accessibility, ship

**Budget:** 4–6 sessions.
**Deliverable:** Itch.io beta page, accessibility audit, performance audit, public playtest.
**Gate:**
- 10 external playtesters complete MVP.
- Success criteria (see [`01-GAME_DESIGN_DOCUMENT.md`](01-GAME_DESIGN_DOCUMENT.md) §10) met.
- No P0 bugs open.

---

## MVP definition (the minimum we'd actually ship)

The MVP corresponds to **Phase 3** complete + a basic ending sequence (Path A or B from [`02-STORY_BIBLE.md`](02-STORY_BIBLE.md) §4). Everything beyond Phase 3 is "full game," not "MVP."

The MVP must contain:

- Title screen, save/load, 3 slots.
- Sol Reed + Brass + 3 recruitable companions (Vel, Pete, Etude).
- Jazz City + Bayou regions fully traversable.
- 1 Quartet boss (Diminuendo).
- ≥2 hours of content.
- Settings menu with accessibility toggles.
- Two music tracks (Jazz, Bayou) + one combat track.
- 12 SFX minimum.
- A short ending sequence that closes Sol's arc, even if the rest of the story is teased.

---

## Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Asset pipeline produces inconsistent character art | High | High | Lock model sheets early; use ref-image conditioning; Path-C for heroes. |
| Rhythm system feels punishing | Medium | High | Default Relaxed-Rhythm to on for Easy; playtest early. |
| Boss animations balloon scope | High | Medium | Strict frame-count budgets per phase; Cuphead-grade is the *ceiling*, not the floor. |
| Audio drift desyncs combat | Medium | High | MusicClock anchors to Howler every 250ms; drift test in CI. |
| Save schema migration breaks playtester saves | Low | High | Schema versioned from day one; migrations tested. |
| Scope creep — extra regions, mechanics | High | High | MVP is Phase 3; Phase 5 anything must be on the roadmap, not impromptu. |
| Codex delegations under-specified, return junk | Medium | Medium | Strict spec template; failed specs return for rewrite, not retry. |

---

## Decision log (where ADRs go)

`docs/adr/ADR-<NNN>-<slug>.md`. Numbering starts at 001 (Canvas2D), 002 (Asset source mix), 003 (Audio engine choice). Add an ADR for any reversible decision that future engineers might question.

---

## Calendar realism

This is a long project. The roadmap above is **session-cost**, not wall-clock. Wall-clock will depend on user availability, Codex telemetry maturity (faster shadow → primary promotion = faster waves), and whether Path C (hand-art) is unlocked with a budget for an artist.

A realistic wall-clock guess for the MVP (Phases 0–3) on the OS Brain platform as of 2026-05-11: **3 to 6 weeks of focused part-time work**. Full game (Phases 0–6) is closer to **6 to 9 months**.

That's honest, not motivational.
