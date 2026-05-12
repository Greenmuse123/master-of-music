import { z } from 'zod';

import type { DialogueScript } from './dialogue-types';

const dialogueChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  next: z.string(),
  flag: z.string().optional(),
});

const dialogueNodeSchema = z.object({
  id: z.string(),
  speaker: z.string().optional(),
  portrait: z.string().optional(),
  lines: z.array(z.string()),
  next: z.string().optional(),
  choices: z.array(dialogueChoiceSchema).optional(),
});

const dialogueScriptSchema = z.object({
  id: z.string(),
  entry: z.string(),
  nodes: z.record(dialogueNodeSchema),
});

export function parseDialogueScript(json: unknown): DialogueScript {
  const script = dialogueScriptSchema.parse(json);

  if (script.nodes[script.entry] === undefined) {
    throw new Error(`Dialogue script "${script.id}" entry references unknown node "${script.entry}".`);
  }

  for (const node of Object.values(script.nodes)) {
    if (node.next !== undefined && script.nodes[node.next] === undefined) {
      throw new Error(`Dialogue node "${node.id}" next references unknown node "${node.next}".`);
    }

    if (node.choices !== undefined) {
      for (const choice of node.choices) {
        if (script.nodes[choice.next] === undefined) {
          throw new Error(
            `Dialogue choice "${choice.id}" in node "${node.id}" references unknown node "${choice.next}".`,
          );
        }
      }
    }
  }

  return script;
}
