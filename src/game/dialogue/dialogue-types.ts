export type DialogueChoice = {
  id: string;
  label: string;
  next: string;
  flag?: string;
};

export type DialogueNode = {
  id: string;
  speaker?: string;
  portrait?: string;
  lines: string[];
  next?: string;
  choices?: DialogueChoice[];
};

export type DialogueScript = {
  id: string;
  entry: string;
  nodes: Record<string, DialogueNode>;
};

export type DialogueEvent =
  | { kind: 'line'; nodeId: string; speaker?: string; text: string }
  | { kind: 'choices'; nodeId: string; options: DialogueChoice[] }
  | { kind: 'finished'; path: string[]; flags: string[] };
