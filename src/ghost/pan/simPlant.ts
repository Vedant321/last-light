// Simulated pan camera (handbook v2, 5.6–5.7). Implements the PlantDriver contract.
// - Hidden "true" motor parameters (normal / heavy). The predictor never sees them.
// - Fixed 20 ms tick grid; a command takes effect at the first tick T >= tScheduled.
// - Emits a noisy measured-angle Observation every tick (public, goes into the downlink).
// - Emits the TRUE angle on a private channel (onTruth) for the evaluator only.
// - Records each tick's TRUE capture angle in the frame store: this is the simulated
//   camera "image" content, rendered later as the delayed video.
import { DOWNLINK_MS, TICK_MS } from "../config";
import type { Command, Observation, PlantDriver } from "../types";
import { stepServo, tickAtOrBefore, tickTime, type ServoParams } from "./model";

export const TRUE_PARAMS_NORMAL: ServoParams = { alpha: 0.15, rDegPerSec: 90 };
export const TRUE_PARAMS_HEAVY: ServoParams = { alpha: 0.07, rDegPerSec: 45 };

export interface SimPlantOptions {
  seed?: number;
  /** Std-dev of measurement noise in degrees (0 = noiseless, for tests). */
  noiseDeg?: number;
  /** PRIVATE evaluator channel: true angle at each tick time. */
  onTruth?: (tSample: number, trueAngleDeg: number) => void;
  /** Frame store: frameId → true camera angle at capture (simulated image content). */
  frames?: Map<number, number>;
}

/** Small seeded RNG (mulberry32) so runs are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class PanSimPlant implements PlantDriver {
  private theta = 0;
  private u = 0;
  private nextTick: number | null = null;
  private pending: Command[] = [];
  private params: ServoParams = { ...TRUE_PARAMS_NORMAL };
  private heavy = false;
  private rng: () => number;
  private obsId = 0;
  private onObservation: ((o: Observation) => void) | null = null;

  constructor(
    private readonly sessionId: string,
    private readonly opts: SimPlantOptions = {},
  ) {
    this.rng = mulberry32(opts.seed ?? 42);
  }

  async start(onObservation: (o: Observation) => void): Promise<void> {
    this.onObservation = onObservation;
  }

  async applyCommand(command: Command, _tDispatch: number): Promise<void> {
    if (command.sessionId !== this.sessionId) return; // stale session
    // Keep pending sorted by tScheduled (constant uplink delay keeps issue order).
    this.pending.push(command);
    this.pending.sort((a, b) => a.tScheduled - b.tScheduled || a.id - b.id);
  }

  /** Advance physics on the fixed tick grid up to and including the tick at or before tNow. */
  step(tNow: number): void {
    const kEnd = tickAtOrBefore(tNow);
    if (this.nextTick === null) this.nextTick = kEnd;
    while (this.nextTick <= kEnd) {
      const T = tickTime(this.nextTick);
      while (this.pending.length && this.pending[0].tScheduled <= T) {
        this.u = this.pending.shift()!.angleDeg;
      }
      this.emit(T);
      this.theta = stepServo(this.theta, this.u, this.params);
      this.nextTick += 1;
    }
  }

  /** SIM-only "change the motor" toggle (e.g., a clip-on weight). Hidden from the predictor. */
  setHeavy(on: boolean): void {
    this.heavy = on;
    this.params = { ...(on ? TRUE_PARAMS_HEAVY : TRUE_PARAMS_NORMAL) };
  }

  isHeavy(): boolean {
    return this.heavy;
  }

  async reset(): Promise<void> {
    this.theta = 0;
    this.u = 0;
    this.nextTick = null;
    this.pending = [];
  }

  async dispose(): Promise<void> {
    this.onObservation = null;
    this.pending = [];
  }

  private emit(T: number): void {
    const noiseDeg = this.opts.noiseDeg ?? 0.15;
    const id = ++this.obsId;
    this.opts.frames?.set(id, this.theta);
    this.opts.onTruth?.(T, this.theta);
    const observation: Observation = {
      sessionId: this.sessionId,
      id,
      tSample: T,
      tReceived: T,
      tDeliver: T + DOWNLINK_MS,
      timestampSource: "SIM",
      timestampUncertaintyMs: 0,
      angleDeg: this.theta + noiseDeg * this.gaussian(),
      valid: true,
      markerIds: [],
      frameId: id,
    };
    this.onObservation?.(observation);
  }

  private gaussian(): number {
    // Box–Muller
    const u1 = Math.max(this.rng(), 1e-12);
    const u2 = this.rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

export const SIM_TICK_MS = TICK_MS;
