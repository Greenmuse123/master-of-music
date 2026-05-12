#!/usr/bin/env node
/**
 * Workflow validator for .github/workflows/*.yml.
 *
 * Runs as part of `npm run verify:workflow` and is on the codex-delegate.cjs
 * wrapper allowlist via the `node scripts/` prefix. Replaces the host-level
 * tooling fallback (actionlint / python -c yaml) that was unavailable during
 * Phase 0 (see docs/audits/wave-0-closure.md §3 I-4 and I-5).
 *
 * Asserts, for each workflow file:
 *   1. The YAML parses without error.
 *   2. The root object has `name`, `on`, and `jobs` keys.
 *   3. Every step's `uses:` directive pins to a tag (e.g. `@v4`), not a moving
 *      ref like `@main`.
 *   4. Every `actions/*` referenced is in the project's allow-list (Phase 0:
 *      only checkout + setup-node).
 *
 * Exits 0 on success, 1 on the first failure.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');
const ACTION_ALLOWLIST = new Set([
  'actions/checkout',
  'actions/setup-node',
]);

function fail(msg) {
  process.stderr.write('verify-workflow: ' + msg + '\n');
  process.exit(1);
}

function listWorkflowFiles() {
  if (!fs.existsSync(WORKFLOW_DIR)) {
    fail('no .github/workflows directory');
  }
  return fs
    .readdirSync(WORKFLOW_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => path.join(WORKFLOW_DIR, f));
}

function check(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  let doc;
  try {
    doc = yaml.load(text);
  } catch (err) {
    fail(filePath + ': YAML parse error: ' + err.message);
  }
  if (!doc || typeof doc !== 'object') {
    fail(filePath + ': YAML root is not an object');
  }
  for (const required of ['name', 'on', 'jobs']) {
    if (!(required in doc)) {
      fail(filePath + ': missing required top-level key "' + required + '"');
    }
  }
  for (const [jobName, job] of Object.entries(doc.jobs)) {
    if (!job || typeof job !== 'object') {
      fail(filePath + ': job "' + jobName + '" is not an object');
    }
    const steps = Array.isArray(job.steps) ? job.steps : [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step && typeof step.uses === 'string') {
        const match = /^([^@]+)@(.+)$/.exec(step.uses);
        if (!match) {
          fail(filePath + ': job "' + jobName + '" step ' + i + ' uses "' + step.uses + '" without @ref pin');
        }
        const [, action, ref] = match;
        if (!ACTION_ALLOWLIST.has(action)) {
          fail(filePath + ': job "' + jobName + '" step ' + i + ' uses non-allowlisted action "' + action + '" (allowed: ' + Array.from(ACTION_ALLOWLIST).join(', ') + ')');
        }
        if (!/^v\d+(\.\d+)*$/.test(ref)) {
          fail(filePath + ': job "' + jobName + '" step ' + i + ' uses unpinned ref "' + ref + '" (must be a version tag like v4)');
        }
      }
    }
  }
  process.stdout.write('verify-workflow: ' + path.basename(filePath) + ' ok\n');
}

function main() {
  const files = listWorkflowFiles();
  if (files.length === 0) {
    fail('no .yml/.yaml files in .github/workflows');
  }
  for (const f of files) {
    check(f);
  }
  process.stdout.write('verify-workflow: all ' + files.length + ' workflow file(s) ok\n');
}

main();
