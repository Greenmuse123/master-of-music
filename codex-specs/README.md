# Codex Specs — Master of Music

This directory holds **ready-to-run Codex delegation specs** that the fresh orchestrator can execute through `codex-delegate.cjs`.

## How to invoke

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/<NN-name>.json
```

(Path is relative to the project root: `projects/master-of-music/`. The helper lives in OS Brain at `.claude/helpers/codex-delegate.cjs`.)

For a dry-run preview:

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/01-scaffold-engine.json --dry-run
```

## Spec contract (canonical fields)

Every spec must include:

- `goal` — what to accomplish, single sentence.
- `files[]` — paths the worker may read/write.
- `acceptance[]` — observable conditions the work must meet.
- `verification[]` — shell commands the wrapper runs after Codex, exit-0 = pass.
- `constraints` *(opt)* — boundaries (don't add new deps; preserve API; etc.).
- `sandbox` *(opt, default `read-only`)* — `read-only` | `read-write`.
- `model` *(opt)* — defaults to gpt-5.
- `timeoutMs` *(opt)* — defaults to 600000.

Schema: `../../docs/codex-spec.schema.json` in OS Brain.

## Phase mapping (build order)

| Phase | Spec | Purpose |
|-------|------|---------|
| 0 | `01-scaffold-engine.json` | Vite + TS + Vitest + ESLint project skeleton |
| 0 | `02-asset-pipeline-scaffold.json` | `tools/asset-pipeline/` scaffold |
| 0 | `03-ci-workflow.json` | GitHub Actions CI for lint+typecheck+test+build |
| 1 | `04-renderer-core.json` | Canvas2D renderer + sprite + animation |
| 1 | `05-input-manager.json` | Keyboard + gamepad input mapper |
| 1 | `06-music-clock.json` | MusicClock with beat/phase + Howler anchor |
| 1 | `07-textbox-widget.json` | Dialogue textbox UI |
| 2 | `08-rhythm-window.json` | `evaluateRhythmHit` pure function + tests |
| 2 | `09-type-table.json` | Genre matchup table + lookup |
| 2 | `10-parry.json` | Parry window + steal-cue mechanic |
| 2 | `11-dissonance-meter.json` | Dissonance accumulation + vulnerability trigger |
| 2 | `12-boss-phases.json` | Boss phase script runner |

## Anti-patterns (what *not* to put in a spec)

- "Implement combat." → too broad, will return garbage.
- "Draw a sax sprite." → Codex doesn't draw.
- "Refactor the entire engine." → too many files; orchestrator's job.
- "Decide whether to use ECS." → architectural; orchestrator's job.

## Spec lifecycle

1. Orchestrator writes/edits spec in this dir.
2. `--dry-run` previews.
3. Real invocation runs Codex, captures output to NDJSON telemetry.
4. Wrapper runs `verification[]` (bash). Exit codes recorded.
5. Orchestrator reads result, decides accept / rewrite-spec / escalate.

**Never re-prompt Codex inline.** A failed spec is a *spec-quality* signal, not a worker-quality signal — rewrite and re-run.
