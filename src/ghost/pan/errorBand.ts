// Error band (handbook v2, 5.9) — "recent prediction error", NOT a confidence interval.
// - Predictions are logged at a fixed 10 Hz (NOW and FUTURE kinds kept separately).
// - Each is matched to later RELEASED observations by sample time, interpolating only
//   between valid samples at most MAX_SAMPLE_GAP_MS apart; otherwise left unscored.
// - A FUTURE prediction assumes no further input: if any command is issued after it was
//   made and at/before its target time, it is INVALIDATED (not scored).
// - band = 2 × RMS of the last N matched errors for that kind; null while warming up.
import { MAX_SAMPLE_GAP_MS } from "../config";
import type { Observation, PredictionKind } from "../types";

interface LoggedPrediction {
  kind: PredictionKind;
  tMade: number;
  tFor: number;
  angleDeg: number;
}

export type BandState = "warming" | "ok" | "stale";

export interface BandReading {
  state: BandState;
  /** 2 × RMS recent error in degrees, or null while warming up / stale. */
  bandDeg: number | null;
  matched: number;
}

export class ErrorBandTracker {
  private pending: LoggedPrediction[] = [];
  private errors: Record<PredictionKind, number[]> = { NOW: [], FUTURE: [] };
  private prev: Observation | null = null;
  private commandIssueTimes: number[] = [];
  invalidated = 0;
  unscored = 0;

  constructor(
    private readonly window = 50,
    private readonly minMatched = 10,
  ) {}

  onCommandIssued(tIssued: number): void {
    this.commandIssueTimes.push(tIssued);
    if (this.commandIssueTimes.length > 500) this.commandIssueTimes.shift();
  }

  log(kind: PredictionKind, tMade: number, tFor: number, angleDeg: number | null): void {
    if (angleDeg === null) return;
    this.pending.push({ kind, tMade, tFor, angleDeg });
  }

  /** Call with every released observation, in release order. */
  onReleasedObservation(o: Observation): void {
    if (!o.valid || o.angleDeg === null) {
      this.prev = null; // a tracking gap breaks interpolation
      return;
    }
    const prev = this.prev;
    this.prev = o;
    const remaining: LoggedPrediction[] = [];
    for (const p of this.pending) {
      if (p.tFor > o.tSample) {
        remaining.push(p); // not verifiable yet
        continue;
      }
      if (p.kind === "FUTURE" && this.commandIssueTimes.some((t) => t > p.tMade && t <= p.tFor)) {
        this.invalidated++;
        continue;
      }
      let truthLike: number | null = null;
      if (p.tFor === o.tSample) truthLike = o.angleDeg;
      else if (prev && prev.angleDeg !== null && prev.tSample <= p.tFor && o.tSample - prev.tSample <= MAX_SAMPLE_GAP_MS) {
        const f = (p.tFor - prev.tSample) / (o.tSample - prev.tSample);
        truthLike = prev.angleDeg + f * (o.angleDeg - prev.angleDeg);
      }
      if (truthLike === null) {
        this.unscored++;
        continue;
      }
      const list = this.errors[p.kind];
      list.push(p.angleDeg - truthLike);
      if (list.length > this.window) list.shift();
    }
    this.pending = remaining;
  }

  reading(kind: PredictionKind, now: number, staleAfterMs: number, latestDeliver: number | null): BandReading {
    const list = this.errors[kind];
    if (latestDeliver === null || now - latestDeliver > staleAfterMs) return { state: "stale", bandDeg: null, matched: list.length };
    if (list.length < this.minMatched) return { state: "warming", bandDeg: null, matched: list.length };
    const rms = Math.sqrt(list.reduce((a, e) => a + e * e, 0) / list.length);
    return { state: "ok", bandDeg: 2 * rms, matched: list.length };
  }
}
