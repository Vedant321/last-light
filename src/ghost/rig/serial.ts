import { RigLineDecoder, servoCommand, type RigMessage } from './protocol';

interface SerialPortLike {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface SerialApiLike { requestPort(): Promise<SerialPortLike> }

export function webSerialAvailable(): boolean {
  return !!(navigator as Navigator & { serial?: SerialApiLike }).serial;
}

export class RigSerial {
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private readTask: Promise<void> | null = null;
  private decoder = new RigLineDecoder();
  private sequence = 0;
  private writeTail: Promise<void> = Promise.resolve();
  private closing = false;
  private pending = new Map<number, { angle: number; resolve: () => void; reject: (error: Error) => void; timer: number }>();

  constructor(
    private readonly onMessage: (message: RigMessage) => void,
    private readonly onDisconnect: (reason: string) => void,
  ) {}

  get connected(): boolean { return this.port !== null && !this.closing; }

  async connect(): Promise<void> {
    if (this.port) throw new Error('Already connected');
    const serial = (navigator as Navigator & { serial?: SerialApiLike }).serial;
    if (!serial) throw new Error('Web Serial is unavailable. Use desktop Chrome on localhost.');
    // Must happen directly from the button's click handler.
    const port = await serial.requestPort();
    await port.open({ baudRate: 115200 });
    if (!port.readable || !port.writable) {
      await port.close();
      throw new Error('The serial port has no readable or writable stream.');
    }
    this.port = port;
    this.closing = false;
    this.sequence = 0;
    this.decoder.reset();
    this.reader = port.readable.getReader();
    this.writer = port.writable.getWriter();
    this.readTask = this.readLoop();
  }

  async sendAngle(angle: number): Promise<void> {
    if (!this.writer || !this.connected) throw new Error('Connect the Arduino first.');
    const sequence = ++this.sequence;
    const bytes = new TextEncoder().encode(servoCommand(sequence, angle));
    let resolveAck!: () => void;
    let rejectAck!: (error: Error) => void;
    const ack = new Promise<void>((resolve, reject) => { resolveAck = resolve; rejectAck = reject; });
    const timer = window.setTimeout(() => {
      const entry = this.pending.get(sequence);
      if (entry) { this.pending.delete(sequence); entry.reject(new Error(`No acknowledgement for command ${sequence}.`)); }
    }, 2000);
    this.pending.set(sequence, { angle, resolve: resolveAck, reject: rejectAck, timer });
    const writer = this.writer;
    const write = this.writeTail.then(() => writer.write(bytes));
    this.writeTail = write.catch(() => {});
    try { await write; } catch (error) {
      this.failPending(error instanceof Error ? error : new Error(String(error)));
      void this.disconnect('Serial write failed');
    }
    return ack;
  }

  async disconnect(reason = 'Disconnected'): Promise<void> {
    if (!this.port || this.closing) return;
    this.closing = true;
    this.failPending(new Error(reason));
    try { await this.reader?.cancel(); } catch { /* unplugged */ }
    try { await this.readTask; } catch { /* read error handled below */ }
    try { this.writer?.releaseLock(); } catch { /* unplugged */ }
    try { await this.port.close(); } catch { /* unplugged */ }
    this.reader = null;
    this.writer = null;
    this.port = null;
    this.readTask = null;
    this.onDisconnect(reason);
  }

  private async readLoop(): Promise<void> {
    let reason = 'Arduino disconnected';
    try {
      while (this.reader) {
        const { done, value } = await this.reader.read();
        if (done) break;
        if (!value) continue;
        for (const message of this.decoder.push(value)) {
          if (message.type === 'ready') {
            this.failPending(new Error('Arduino restarted; previous commands cleared.'));
            this.sequence = 0;
          } else if (message.type === 'ack') {
            const entry = this.pending.get(message.sequence);
            if (!entry || entry.angle !== message.angleDeg) {
              reason = 'Unexpected Arduino acknowledgement';
              throw new Error(reason);
            }
            window.clearTimeout(entry.timer);
            this.pending.delete(message.sequence);
            entry.resolve();
          }
          this.onMessage(message);
        }
      }
    } catch (error) {
      reason = error instanceof Error ? error.message : 'Serial read failed';
    } finally {
      try { this.reader?.releaseLock(); } catch { /* unplugged */ }
      this.reader = null;
      // Allow readTask to settle before disconnect waits for it.
      queueMicrotask(() => { if (!this.closing) void this.disconnect(reason); });
    }
  }

  private failPending(error: Error): void {
    for (const entry of this.pending.values()) {
      window.clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
  }
}
