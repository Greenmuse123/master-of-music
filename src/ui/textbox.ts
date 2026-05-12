import { RENDER_H, RENDER_W } from '../config/constants';
import type { Widget } from './widget';

export type TextboxState = 'typing' | 'idle' | 'done';
export type TextboxConfirmResult = 'fast-forward' | 'advance' | 'noop';

export type TextboxOptions = {
  text: string;
  charsPerSec?: number;
  portrait?: HTMLImageElement | null;
};

const PANEL_H = 80;
const PANEL_Y = RENDER_H - PANEL_H;
const BORDER = 4;
const PADDING = 4;
const PORTRAIT_SIZE = 64;
const CHAR_W = 6;
const LINE_H = 10;

export class Textbox implements Widget {
  private readonly charsPerSec: number;
  private readonly portrait: HTMLImageElement | null;
  private readonly text: string;
  private elapsedChars = 0;
  private state: TextboxState;

  constructor({ charsPerSec = 30, portrait = null, text }: TextboxOptions) {
    if (!Number.isFinite(charsPerSec) || charsPerSec <= 0) {
      throw new Error('Textbox charsPerSec must be positive.');
    }

    this.charsPerSec = charsPerSec;
    this.portrait = portrait;
    this.text = text;
    this.state = text.length === 0 ? 'idle' : 'typing';
  }

  update(dtSec: number): void {
    if (this.state !== 'typing') {
      return;
    }

    if (!Number.isFinite(dtSec) || dtSec <= 0) {
      return;
    }

    this.elapsedChars = Math.min(this.text.length, this.elapsedChars + dtSec * this.charsPerSec);

    if (this.visibleCharCount() >= this.text.length) {
      this.state = 'idle';
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const innerX = BORDER;
    const innerY = PANEL_Y + BORDER;
    const innerW = RENDER_W - BORDER * 2;
    const innerH = PANEL_H - BORDER * 2;
    const contentX = innerX + PADDING;
    const contentY = innerY + PADDING;
    const contentW = innerW - PADDING * 2;
    const textX = this.portrait === null ? contentX : contentX + PORTRAIT_SIZE + PADDING;
    const textW = this.portrait === null ? contentW : contentW - PORTRAIT_SIZE - PADDING;

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, PANEL_Y, RENDER_W, PANEL_H);
    ctx.fillStyle = '#f8f0d8';
    ctx.fillRect(innerX, innerY, innerW, innerH);

    if (this.portrait !== null) {
      ctx.drawImage(this.portrait, contentX, contentY, PORTRAIT_SIZE, PORTRAIT_SIZE);
    }

    ctx.fillStyle = '#111111';
    const lines = wrapText(this.visibleText(), Math.max(1, Math.floor(textW / CHAR_W)));

    for (let index = 0; index < lines.length; index += 1) {
      ctx.fillText(lines[index]!, textX, contentY + index * LINE_H);
    }
  }

  confirm(): TextboxConfirmResult {
    if (this.state === 'typing') {
      this.elapsedChars = this.text.length;
      this.state = 'idle';
      return 'fast-forward';
    }

    if (this.state === 'idle') {
      this.state = 'done';
      return 'advance';
    }

    return 'noop';
  }

  isDone(): boolean {
    return this.state === 'done';
  }

  private visibleCharCount(): number {
    return Math.min(this.text.length, Math.floor(this.elapsedChars));
  }

  private visibleText(): string {
    return this.text.slice(0, this.visibleCharCount());
  }
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (text.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let line = '';

  for (const word of text.split(' ')) {
    if (word.length === 0) {
      continue;
    }

    if (word.length > maxCharsPerLine) {
      line = pushLine(lines, line);
      line = breakLongWord(lines, word, maxCharsPerLine);
      continue;
    }

    const nextLine = line.length === 0 ? word : `${line} ${word}`;

    if (nextLine.length <= maxCharsPerLine) {
      line = nextLine;
    } else {
      lines.push(line);
      line = word;
    }
  }

  if (line.length > 0) {
    lines.push(line);
  }

  return lines;
}

function breakLongWord(lines: string[], word: string, maxCharsPerLine: number): string {
  let cursor = 0;

  while (cursor + maxCharsPerLine < word.length) {
    lines.push(word.slice(cursor, cursor + maxCharsPerLine));
    cursor += maxCharsPerLine;
  }

  return word.slice(cursor);
}

function pushLine(lines: string[], line: string): string {
  if (line.length > 0) {
    lines.push(line);
  }

  return '';
}
