export type RigMessage =
  | { type: 'ready'; version: 1 }
  | { type: 'knob'; raw: number; pressed: boolean }
  | { type: 'ack'; sequence: number; angleDeg: number };

const MAX_LINE_LENGTH = 39;

export function parseRigLine(line: string): RigMessage | null {
  if (line === 'READY,1') return { type: 'ready', version: 1 };
  let match = /^K,(\d{1,4}),([01])$/.exec(line);
  if (match) {
    const raw = Number(match[1]);
    return raw <= 1023 ? { type: 'knob', raw, pressed: match[2] === '1' } : null;
  }
  match = /^A,([1-9]\d*),(-?\d{1,2})$/.exec(line);
  if (match) {
    const sequence = Number(match[1]);
    const angleDeg = Number(match[2]);
    return Number.isSafeInteger(sequence) && angleDeg >= -30 && angleDeg <= 30
      ? { type: 'ack', sequence, angleDeg } : null;
  }
  return null;
}

/** Serial reads are arbitrary byte chunks, not whole lines. */
export class RigLineDecoder {
  private readonly decoder = new TextDecoder();
  private line = '';
  private dropping = false;

  push(chunk: Uint8Array): RigMessage[] {
    const messages: RigMessage[] = [];
    for (const character of this.decoder.decode(chunk, { stream: true })) {
      if (character === '\n') {
        if (!this.dropping) {
          const line = this.line.endsWith('\r') ? this.line.slice(0, -1) : this.line;
          const parsed = parseRigLine(line);
          if (parsed) messages.push(parsed);
        }
        this.line = '';
        this.dropping = false;
      } else if (!this.dropping) {
        if (character.charCodeAt(0) < 32 && character !== '\r') this.dropping = true;
        else if (this.line.length < MAX_LINE_LENGTH) this.line += character;
        else this.dropping = true;
      }
    }
    return messages;
  }

  reset(): void { this.line = ''; this.dropping = false; this.decoder.decode(); }
}

export function servoCommand(sequence: number, angleDeg: number): string {
  if (!Number.isSafeInteger(sequence) || sequence <= 0 || !Number.isInteger(angleDeg) || angleDeg < -30 || angleDeg > 30)
    throw new RangeError('Invalid servo command');
  return `S,${sequence},${angleDeg}\n`;
}
