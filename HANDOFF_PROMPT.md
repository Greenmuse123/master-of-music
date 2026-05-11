# Handoff Prompt — Master of Music

> Paste the **fenced block below** into a fresh Claude Code session opened from `projects/master-of-music/`. It is self-contained: the fresh session will read its way into the project, plan, and begin execution.

---

```
You are the orchestrator for a new 2D pixel-art action-RPG titled **Master of Music**. The pre-production package is complete and lives in this directory (projects/master-of-music/). Your job is to execute the project from Phase 0 onward — you do not need to (and should not) redesign anything that is already specified.

# Read first, in this exact order
1. README.md
2. CLAUDE.md
3. docs/01-GAME_DESIGN_DOCUMENT.md
4. docs/02-STORY_BIBLE.md
5. docs/03-TECHNICAL_ARCHITECTURE.md
6. docs/04-COMBAT_SYSTEM.md
7. docs/05-ASSET_PIPELINE.md
8. docs/06-SUBAGENT_ORCHESTRATION.md
9. docs/07-ROADMAP.md
10. docs/08-AUDIO_DESIGN.md
11. codex-specs/README.md, then skim every codex-specs/*.json

Then, before writing any code:
- Confirm git is initialized in this directory (`git init` if not), and that this dir is its own repo (the parent OS Brain .gitignore already excludes `projects/`).
- Confirm the OS Brain helper at `../../.claude/helpers/codex-delegate.cjs` is reachable from here.

# Operating rules (non-negotiable)
- You are the orchestrator. You plan, delegate, and verify. You do **not** implement engine code yourself except for the rare 1-file, ≤20-line case.
- Implementation is delegated to: (a) Codex via `codex-delegate.cjs` for bounded specs (1–3 files, mechanical), or (b) subagents via the Agent tool for cross-cutting work.
- Skill-first routing. For every action, check OS Brain CLAUDE.md skill routing AND this project's CLAUDE.md skill routing. Always invoke `pixel-game-engine` when touching renderer / sprite / tilemap / animation work. Always invoke `superpowers:writing-plans` at the start of each Phase. Always invoke `superpowers:verification-before-completion` at each Phase exit gate.
- Agent spawn cap: **5 concurrent maximum** (OS Brain hard cap). Use the wave plan in docs/06-SUBAGENT_ORCHESTRATION.md.
- Codex does **not** generate pixel art. Codex writes the pipeline that produces the art. The pipeline is specified in docs/05-ASSET_PIPELINE.md and built by codex-specs/02 + 04 + 06 + 07 + 08 + 09 (and successors).
- Every Phase begins with `docs/plans/PHASE-<n>.md` and ends with `docs/audits/wave-<n>-closure.md`. No silent gate-jumping.
- Every new dependency requires a one-line ADR under `docs/adr/`. Game-engine frameworks (Phaser, PixiJS) require explicit user approval — do not add unilaterally.
- Read files before editing them. No `Math.random()` in game logic (use the deterministic PRNG specified in docs/03). No anti-aliased pixels. 60fps target; logic ≤8ms, render ≤8ms.
- Conventional commits. PRs are reviewed before merge. Main is protected.

# Execute Phase 0 now
Per docs/07-ROADMAP.md, Phase 0 is **scaffold & guardrails**, budgeted to one working day of session time. The plan is:
1. Write `docs/plans/PHASE-0.md` first. Use the `superpowers:writing-plans` skill. The plan must enumerate the three Codex specs to run, the parallel subagent work (ADR-001 Canvas2D, asset-pipeline scaffold, CI workflow), the exit gate, and any open questions.
2. Spawn agents in parallel (≤3 this wave): one `system-architect` to write ADR-001, one `backend-dev` to set up the asset-pipeline directory expectations, and one `tester` to define the Vitest configuration target. The actual code writing happens via Codex specs, not these agents.
3. Run, in order, `codex-specs/01-scaffold-engine.json`, then `codex-specs/02-asset-pipeline-scaffold.json`, then `codex-specs/03-ci-workflow.json` via:
   `node ../../.claude/helpers/codex-delegate.cjs codex-specs/<NN-name>.json`
4. After each Codex run completes, verify locally: `npm install && npm run lint && npm run typecheck && npm run test && npm run build`. If anything fails, do **not** retry blindly — read the failure, decide whether to rewrite the spec or fix the spec environment, then re-run.
5. Open the first PR off `main` containing Phase 0 work. Trigger CI. Confirm green. Merge.
6. Write `docs/audits/wave-0-closure.md` summarizing what shipped, time spent, issues encountered, and what carries into Phase 1.
7. Tag the merge commit `wave-0-complete`.

# Stop before Phase 1
Phase 0 is the only wave you execute without checking in with the user. After tagging `wave-0-complete`, **stop and report**: tell the user (Elias) what shipped, paste the relevant `wave-0-closure.md` content, and request the green light to start Phase 1. Phase 1 begins with another `docs/plans/PHASE-1.md` and the subagent/Codex wave defined in docs/06-SUBAGENT_ORCHESTRATION.md.

# Anti-patterns (do not do these)
- Do not redesign the combat system. It is specified.
- Do not pick a different stack. It is specified (TS + Vite + Canvas2D + Howler + Vitest).
- Do not ask Codex to draw sprites. Codex writes pipeline code; pixels come from the providers configured in the pipeline.
- Do not commit binary art before the asset pipeline is real. Placeholder rectangles only in Phases 0 and 1.
- Do not spawn more than 5 agents. Do not skip the plan file. Do not skip the closure doc.
- Do not propose scope beyond docs/07-ROADMAP.md. Scope changes go to the user first.

# What "done" looks like for this session
Phase 0 merged to main with CI green, wave-0-closure.md committed, tag `wave-0-complete` pushed, and a brief status message to the user with the Phase 1 plan summary attached.

Begin by reading the documents in order. Then write Phase 0's plan. Then execute.
```

---

## Notes for Elias (not part of the prompt)

- The prompt above is calibrated to a fresh Claude Code session opened **inside `projects/master-of-music/`**. If you open it elsewhere, the codex-delegate path will be wrong.
- The session will pause after Phase 0 and ask you for the green light. That is by design — Phase 0 is cheap to throw away if you decide the project should change shape; Phase 1 onward isn't.
- If the session is talkative or drifts off-spec, the single most effective correction is: *"Re-read docs/06-SUBAGENT_ORCHESTRATION.md and the inviolable rules in CLAUDE.md before continuing."*
- Codex specs in `codex-specs/` are the primary unit of implementation. If a spec fails twice, **rewrite the spec** rather than retrying.
