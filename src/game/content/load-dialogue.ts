/**
 * Dialogue JSON loader for Phase-3 content.
 *
 * Thin adapter over the spec-16 {@link parseDialogueScript} validator. Single
 * scripts go through {@link loadDialogue}; batch ingestion goes through
 * {@link loadAllDialogues}, which keys parsed scripts by their `id` and
 * rejects duplicates so the caller never silently overwrites content.
 */

import type { DialogueScript } from '../dialogue/dialogue-types';
import { parseDialogueScript } from '../dialogue/parser';

/**
 * Parse a single dialogue JSON record. Throws a `ZodError` (or the parser's
 * own `Error`) if the payload is malformed or references unknown nodes.
 */
export function loadDialogue(json: unknown): DialogueScript {
  return parseDialogueScript(json);
}

/**
 * Parse a batch of dialogue JSON records into a `Map` keyed by script `id`.
 * Throws if two payloads share the same `id` — duplicates are a content bug,
 * not a runtime concern.
 */
export function loadAllDialogues(jsons: readonly unknown[]): Map<string, DialogueScript> {
  const scripts = new Map<string, DialogueScript>();

  for (const json of jsons) {
    const script = loadDialogue(json);
    if (scripts.has(script.id)) {
      throw new Error(`Duplicate dialogue script id "${script.id}".`);
    }
    scripts.set(script.id, script);
  }

  return scripts;
}
