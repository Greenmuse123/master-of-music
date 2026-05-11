# Phase 0 Implementation Plan — Scaffold & Guardrails

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Master of Music as a real, lintable, type-checked, tested, buildable Vite + TypeScript project with CI, an empty asset-pipeline scaffold, and ADR-001 (Canvas2D over WebGL) committed — so Phase 1 can build the vertical slice on solid ground.

**Architecture:** This phase produces no engine logic. It produces *structure*: project scaffolding, tooling, directory layout, and one architectural decision record. Three sequential Codex specs do the file-level work (`01-scaffold-engine`, `02-asset-pipeline-scaffold`, `03-ci-workflow`). Three parallel subagents author the *expectations* the Codex specs must satisfy (ADR-001, asset-pipeline contract, test strategy) so the orchestrator has a written rubric for verification.

**Tech Stack:** TypeScript 5.x strict · Vite 5.x · Vitest (jsdom) · ESLint + Prettier · GitHub Actions · Canvas 2D (no game framework).

---

## File Structure

| Created by | Path | Responsibility |
|---|---|---|
| Orchestrator (this plan) | `docs/plans/PHASE-0.md` | This file |
| Subagent (system-architect) | `docs/adr/ADR-001-canvas2d-renderer.md` | Records Canvas2D choice + reversibility plan |
| Subagent (backend-dev) | `docs/asset-pipeline-contract.md` | The rubric spec 02 must satisfy (directory + CLI shape) |
| Subagent (tester) | `tests/STRATEGY.md` | Vitest configuration target + coverage gates |
| Codex spec 01 | `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.eslintrc.cjs`, `.prettierrc`, `index.html`, `src/main.ts`, `src/game.ts`, `src/config/constants.ts`, `src/engine/render/renderer.ts` (+test), `src/engine/scene/{scene,scene-stack}.ts` (+test for scene-stack), `src/scenes/title-scene.ts` | Vite/TS/Vitest skeleton with Canvas2D bootstrap |
| Codex spec 02 | `tools/asset-pipeline/{package.json,tsconfig.json,README.md}`, `tools/asset-pipeline/src/{cli.ts,config.schema.ts,generate/client.ts,generate/providers/procedural.ts,process/index.ts,pack/manifest.ts,validate/palette-check.ts}` (+tests), `tools/asset-pipeline/jobs/_palettes/jazz.json` | Empty-but-real asset pipeline scaffold with 5 stub CLI subcommands |
| Codex spec 03 | `.github/workflows/ci.yml`, `.github/CODEOWNERS`, `.github/pull_request_template.md` | CI wiring |
| Orchestrator | `docs/audits/wave-0-closure.md` | Wave closure |

---

## Pre-flight (must be true before any task runs)

- [ ] **`pwd` is `projects/master-of-music/`.** All commands below assume this CWD.
- [ ] **Codex helper reachable:** `test -f ../../.claude/helpers/codex-delegate.cjs` returns 0.
- [ ] **Node + npm:** `node --version` ≥ 22.x; `npm --version` ≥ 10.x. (Confirmed in pre-session check: Node v22.14.0, npm 11.11.1.)
- [ ] **Python on PATH:** spec 03's verification uses `python -c "import yaml,sys; yaml.safe_load(...)"`. If `python` is missing or `yaml` import fails, spec 03 verification will fail — note this as an env risk; remediation is `pip install pyyaml` or swap to `node -e` parser in a rewrite.
- [ ] **Parent dir is OS Brain repo;** this dir is NOT yet its own `.git`. We `git init` here as Task 1.

---

## Task 1: Initialize git repo

**Files:**
- Create: `.git/` (via `git init`)

- [ ] **Step 1: Init repo with `main` as default branch**

```bash
git init -b main
git config user.name "Elias Musleh"
git config user.email "greenvalleyaisolutions@gmail.com"
```

Expected: "Initialized empty Git repository in …/master-of-music/.git/"

- [ ] **Step 2: Stage the pre-prod docs already in the directory**

```bash
git add .gitignore README.md CLAUDE.md HANDOFF_PROMPT.md docs/ codex-specs/
```

- [ ] **Step 3: Initial commit**

```bash
git commit -m "chore: initial pre-prod docs + codex specs

Bootstraps the project repository with the design package authored
2026-05-11 (README, CLAUDE.md, HANDOFF_PROMPT, 8 design docs, 9 codex
specs, .gitignore). No engine code yet."
```

Expected: commit hash printed; tree clean.

- [ ] **Step 4: Verify**

```bash
git log --oneline
git status
```

Expected: 1 commit, working tree clean.

---

## Task 2: Author Phase 0 plan (this file)

- [x] **This file exists** at `docs/plans/PHASE-0.md`. (Done as part of writing this plan.)
- [ ] **Commit it** with Task 1's commit OR as a follow-up commit:

```bash
git add docs/plans/PHASE-0.md
git commit -m "docs(phase-0): implementation plan"
```

---

## Task 3: Spawn three parallel subagents (rubric authors)

These three subagents run **in parallel** and only write docs — they do not produce engine code. Their output is the rubric that Codex specs 01–03 must satisfy.

**Files produced:**
- Create: `docs/adr/ADR-001-canvas2d-renderer.md`
- Create: `docs/asset-pipeline-contract.md`
- Create: `tests/STRATEGY.md`

- [ ] **Step 1: Single message, three Agent tool calls in one block:**

  1. `subagent_type: system-architect` — Write ADR-001. Input: docs/03 §1 (stack table row "Renderer") + §11 question 1. Output: ADR with sections {Context, Decision, Rationale, Alternatives considered, Reversibility, Consequences}, ≤300 words. Must explicitly cite docs/03-TECHNICAL_ARCHITECTURE.md §1 and §11.
  2. `subagent_type: backend-dev` — Write `docs/asset-pipeline-contract.md`. Input: docs/05 §3 + codex-specs/02 (so the contract matches what Codex will produce). Output: rubric stating directory layout, CLI surface (5 subcommands), schema requirements, and one paragraph on what we'll verify post-spec.
  3. `subagent_type: tester` — Write `tests/STRATEGY.md`. Input: docs/03 §8 + codex-specs/01 constraints. Output: Vitest config target (jsdom env, stubbed CanvasRenderingContext2D pattern), coverage gates per layer (90% pure logic / 70% engine modules / 50% scenes), and the 3 Phase-0 tests spec 01 will produce (renderer instantiation, scene-stack push/pop, title-scene enter).

- [ ] **Step 2: Verify all 3 files exist**

```bash
test -f docs/adr/ADR-001-canvas2d-renderer.md && test -f docs/asset-pipeline-contract.md && test -f tests/STRATEGY.md && echo "OK"
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr docs/asset-pipeline-contract.md tests/STRATEGY.md
git commit -m "docs(phase-0): ADR-001 + pipeline contract + test strategy"
```

---

## Task 4: Run codex-spec 01 (scaffold-engine)

**Files (Codex will create):** see codex-specs/01-scaffold-engine.json `files[]`.

- [ ] **Step 1: Dry-run preview**

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/01-scaffold-engine.json --dry-run
```

Expected: prints the rendered prompt, exits 0. Verify the spec is sane.

- [ ] **Step 2: Real run**

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/01-scaffold-engine.json
```

Expected: Codex writes files, wrapper runs `verification[]` (npm install + lint + typecheck + test + build), exit 0. NDJSON telemetry row emitted.

- [ ] **Step 3: If verification failed — diagnose, do NOT blind-retry**

Read the failure. Categorize:
- **Spec-level failure** (Codex output doesn't meet acceptance): rewrite the spec, re-run.
- **Env-level failure** (npm install errored on Windows path, e.g.): fix env, re-run.
Never retry without a diagnosis.

- [ ] **Step 4: Manual smoke-test the dev server**

```bash
timeout 10 npm run dev || true
```

Spec acceptance includes "`npm run dev` opens a window showing a black 480×270 canvas centered with letterboxing" — we cannot verify visual output headless, so we just confirm `npm run dev` boots without crash. Visual confirmation deferred to user.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(phase-0): scaffold Vite + TS + Vitest + ESLint + Canvas2D bootstrap (codex-spec 01)"
```

---

## Task 5: Run codex-spec 02 (asset-pipeline-scaffold)

**Files (Codex will create):** see codex-specs/02-asset-pipeline-scaffold.json `files[]`.

- [ ] **Step 1: Dry-run preview**

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/02-asset-pipeline-scaffold.json --dry-run
```

- [ ] **Step 2: Real run**

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/02-asset-pipeline-scaffold.json
```

Expected: wrapper verification (`npm install && npm run typecheck && npm run test`) exits 0.

- [ ] **Step 3: Additional manual acceptance checks (not in verification[])**

```bash
npm run assets -- --help        # expect 5 subcommands listed
npm run assets -- validate jobs/_palettes/jazz.json   # expect "ok"
```

If either fails, diagnose and decide rewrite-spec vs env-fix.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(phase-0): scaffold asset pipeline tooling at tools/asset-pipeline (codex-spec 02)"
```

---

## Task 6: Run codex-spec 03 (ci-workflow)

**Files (Codex will create):** `.github/workflows/ci.yml`, `.github/CODEOWNERS`, `.github/pull_request_template.md`.

- [ ] **Step 1: Confirm python is available** (spec 03's verification uses `python -c "import yaml; ..."`)

```bash
python --version || echo "PYTHON_MISSING"
python -c "import yaml" || echo "PYYAML_MISSING"
```

If `PYTHON_MISSING` or `PYYAML_MISSING`, install (`pip install pyyaml`) OR rewrite spec 03 verification to use `node -e` YAML parse. Do not skip verification.

- [ ] **Step 2: Dry-run preview**

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/03-ci-workflow.json --dry-run
```

- [ ] **Step 3: Real run**

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/03-ci-workflow.json
```

- [ ] **Step 4: Additional manual acceptance checks**

```bash
test -f .github/workflows/ci.yml
test -f .github/CODEOWNERS
test -f .github/pull_request_template.md
# Sections in PR template:
grep -cE '^##' .github/pull_request_template.md   # expect >= 4
# CODEOWNERS not empty:
test -s .github/CODEOWNERS
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ci(phase-0): GitHub Actions lint + typecheck + test + build (codex-spec 03)"
```

---

## Task 7: Full local CI gate (exit gate part 1)

- [ ] **Step 1: Run the full pipeline once more end-to-end**

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: all exit 0. If anything is red, **return to the task that produced the failing surface** — do not patch around.

- [ ] **Step 2: Capture results**

Record durations and any warnings into the wave closure draft (Task 9).

---

## Task 8: Open Phase 0 PR / handle remote (exit gate part 2)

> **Status check:** This repo has no GitHub remote yet. The HANDOFF says "Open the first PR off main containing Phase 0 work. Trigger CI. Confirm green. Merge." Two paths:

**Path A — defer remote:** Phase 0 lands on local `main` only; PR + CI-green gate moves to Phase 1 entry criterion. We document the gap in `wave-0-closure.md` so it cannot be silently forgotten.

**Path B — create remote now:** Stand up the GitHub repo, push, run CI, merge a no-op PR. Adds wall-clock; needs auth and a repo-name decision.

**Decision (orchestrator's call, no user round-trip per `feedback_no_ask_during_plan_execution`):** **Path A.** Rationale: (1) the value of CI green is "the workflow runs against our code" and we can validate that by running `act` or eyeballing the YAML against the same `npm` commands we just ran locally; (2) creating a remote is reversible and trivial; (3) blocking Phase 0 closure on remote auth is a worse trade than landing a documented gap.

- [ ] **Step 1: Validate the workflow YAML against actionlint OR a node-side parse**

```bash
# actionlint if available, else node yaml parse
which actionlint && actionlint .github/workflows/ci.yml || node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'))"
```

(If neither is available, fall back to `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`.)

- [ ] **Step 2: Document the remote gap in closure**

Add to wave-0-closure.md (Task 9):
> "Phase 0 lands on local main only. GitHub remote + first CI run is a Phase-1 entry criterion. Risk: workflow YAML is locally validated but not exercised by GitHub Actions until then."

---

## Task 9: Write `docs/audits/wave-0-closure.md`

**Files:**
- Create: `docs/audits/wave-0-closure.md`

- [ ] **Step 1: Author the closure**

Required sections:
1. **What shipped** (bullet list of artifacts by path)
2. **Verification evidence** (commands run + exit codes / output excerpts)
3. **Issues encountered** (each with: symptom, diagnosis, resolution)
4. **Time spent** (rough)
5. **Carries into Phase 1** (gaps: remote/CI, anything deferred)
6. **Exit gate** — pass/fail per criterion from docs/06 Wave 0 and HANDOFF
7. **Codex telemetry** — NDJSON rows for the 3 specs, summarized

- [ ] **Step 2: Commit**

```bash
git add docs/audits/wave-0-closure.md
git commit -m "docs(phase-0): wave-0 closure"
```

---

## Task 10: Tag wave-0-complete

- [ ] **Step 1: Tag the final commit**

```bash
git tag -a wave-0-complete -m "Wave 0 complete: scaffold + guardrails. See docs/audits/wave-0-closure.md."
git tag -n9 wave-0-complete
```

Expected: tag created, annotation visible.

- [ ] **Step 2: Verify**

```bash
git log --oneline -10
git tag --list
```

---

## Task 11: Report to user

**STOP HERE. Do not start Phase 1.**

- [ ] **Step 1: Compose status message**

The message must contain:
1. One-sentence summary of what shipped.
2. The full text of `docs/audits/wave-0-closure.md`.
3. The remote-gap note from Task 8.
4. A two-bullet preview of what Phase 1 entry will do (per docs/07 Phase 1 + docs/06 Wave 1).
5. Explicit ask: "Green light to start Phase 1?"

- [ ] **Step 2: Update memory entry**

Update `~/.claude/projects/.../memory/project_master_of_music.md` from `[PRE-PROD]` to `[WAVE-0-COMPLETE]` with the tag SHA.

---

## Exit gate (must all be true)

- [ ] `docs/plans/PHASE-0.md` committed.
- [ ] `docs/adr/ADR-001-canvas2d-renderer.md` committed.
- [ ] `npm run lint && npm run typecheck && npm run test && npm run build` all exit 0 locally.
- [ ] `npm run assets -- --help` lists 5 subcommands.
- [ ] `.github/workflows/ci.yml` is valid YAML referencing only @v4 actions.
- [ ] `docs/audits/wave-0-closure.md` committed with all 7 required sections.
- [ ] Tag `wave-0-complete` exists on the closure commit.
- [ ] User has received the closure and the Phase 1 ask.

---

## Open questions (route at closure)

1. **Remote / CI:** Path A taken; Phase 1 must stand up the remote and observe first CI run before any Phase 1 PR closes.
2. **Asset source mix (ADR-002):** Not in Phase 0 scope. Authored at start of Phase 2 per docs/05 §2.
3. **Python dependency for spec 03:** If this is a recurring friction point, swap CI-workflow verification to a `node -e` YAML parser permanently in a future spec revision.
4. **Codex `bash -c` portability on Windows:** Wrapper uses `bash -c` for verification. PowerShell-only environments will fail; we assume Git Bash / WSL bash is on PATH (it is on this machine).

---

## Anti-patterns to avoid in Phase 0 (per docs/06 §5 + project CLAUDE.md)

- Spawning >3 subagents in this wave (cap stated in docs/06 Wave 0).
- Adding any dependency outside the spec 01 allow-list without an ADR.
- Committing binary art (only placeholder colors allowed until Phase 2+).
- Re-prompting Codex inline. All work goes through specs in `codex-specs/`.
- Marking Phase 0 done without the closure doc + tag.
