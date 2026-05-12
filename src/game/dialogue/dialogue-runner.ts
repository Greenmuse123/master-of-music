import type { DialogueChoice, DialogueEvent, DialogueNode, DialogueScript } from './dialogue-types';

type DialogueRunnerOptions = {
  script: DialogueScript;
  onEvent: (event: DialogueEvent) => void;
};

export class DialogueRunner {
  private readonly script: DialogueScript;
  private readonly onEvent: (event: DialogueEvent) => void;
  private readonly path: string[] = [];
  private readonly flags: string[] = [];
  private currentNode: DialogueNode | undefined;
  private lineIndex = 0;
  private started = false;
  private finished = false;
  private awaitingChoices: DialogueChoice[] | undefined;

  public constructor({ script, onEvent }: DialogueRunnerOptions) {
    this.script = script;
    this.onEvent = onEvent;
  }

  public start(): void {
    if (this.started) {
      return;
    }

    this.validateScript();
    const entryNode = this.getNode(this.script.entry);
    this.started = true;
    this.enterNode(entryNode);
  }

  public advance(): void {
    if (!this.started) {
      throw new Error('DialogueRunner cannot advance before start().');
    }

    if (this.finished) {
      return;
    }

    if (this.awaitingChoices !== undefined) {
      return;
    }

    this.emitCurrentState();
  }

  public select(choiceIndex: number): void {
    if (this.awaitingChoices === undefined) {
      throw new Error('DialogueRunner select() is only valid after a choices event.');
    }

    const choice = this.awaitingChoices[choiceIndex];
    if (choice === undefined) {
      throw new Error(`DialogueRunner choice index ${choiceIndex} is out of range.`);
    }

    this.path.push(choice.id);
    if (choice.flag !== undefined) {
      this.flags.push(choice.flag);
    }

    this.awaitingChoices = undefined;
    this.enterNode(this.getNode(choice.next));
  }

  private enterNode(node: DialogueNode): void {
    this.currentNode = node;
    this.lineIndex = 0;
    this.path.push(node.id);
    this.emitCurrentState();
  }

  private emitCurrentState(): void {
    const node = this.currentNode as DialogueNode;

    const line = node.lines[this.lineIndex];
    if (line !== undefined) {
      this.lineIndex += 1;
      this.onEvent({ kind: 'line', nodeId: node.id, speaker: node.speaker, text: line });
      return;
    }

    if (node.choices !== undefined && node.choices.length > 0) {
      this.awaitingChoices = node.choices;
      this.onEvent({ kind: 'choices', nodeId: node.id, options: node.choices });
      return;
    }

    if (node.next !== undefined) {
      this.enterNode(this.getNode(node.next));
      return;
    }

    this.finished = true;
    this.onEvent({ kind: 'finished', path: [...this.path], flags: [...this.flags] });
  }

  private getNode(nodeId: string): DialogueNode {
    const node = this.script.nodes[nodeId];
    if (node === undefined) {
      throw new Error(`Dialogue script "${this.script.id}" references unknown node "${nodeId}".`);
    }

    return node;
  }

  private validateScript(): void {
    this.getNode(this.script.entry);

    for (const node of Object.values(this.script.nodes)) {
      if (node.next !== undefined) {
        this.getNode(node.next);
      }

      if (node.choices !== undefined) {
        for (const choice of node.choices) {
          this.getNode(choice.next);
        }
      }
    }
  }
}
