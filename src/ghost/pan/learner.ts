// Online learning of the servo model (handbook v2, 5.7).
// - alpha: recursive least squares (RLS) on y = alpha * x with update gates.
// - rDegPerSec: robust plateau speed (median of recent clearly-saturated steps).
// Uses ONLY released observations (consecutive, exactly one tick apart) and the command
// that was in force at the earlier sample. It never sees the plant's true parameters.
import { TICK_MS } from "../config";
import type { ServoParams } from "./model";
import { DT_SEC } from "./model";

export interface LearnerConfig {
  alpha0: number;
  r0: number;
  P0: number;
  lambda: number;
  alphaMin: number;
  alphaMax: number;
  Pmin: number;
  Pmax: number;
  /** |x| below this (degrees) is treated as noise: skip the alpha update. */
  noiseFloorDeg: number;
  /** Use the alpha update only if the predicted step is below this fraction of the max step. */
  unsaturatedMargin: number;
  /** |x| above this (degrees) is treated as a speed-limited step: use it for the speed estimate. */
  saturatedErrorDeg: number;
  speedWindow: number;
}

export const DEFAULT_LEARNER: LearnerConfig = {
  alpha0: 0.14,
  r0: 85,
  P0: 1,
  lambda: 0.98,
  alphaMin: 0.01,
  alphaMax: 0.8,
  Pmin: 1e-6,
  Pmax: 1e3,
  noiseFloorDeg: 1.5,
  unsaturatedMargin: 0.7,
  saturatedErrorDeg: 16,
  speedWindow: 15,
};

export class OnlineServoLearner {
  alpha: number;
  rDegPerSec: number;
  private P: number;
  private speeds: number[] = [];
  /** Counters for transparency in the UI/logs. */
  alphaUpdates = 0;
  speedUpdates = 0;
  skipped = 0;

  constructor(private readonly cfg: LearnerConfig = DEFAULT_LEARNER) {
    this.alpha = cfg.alpha0;
    this.rDegPerSec = cfg.r0;
    this.P = cfg.P0;
  }

  params(): ServoParams {
    return { alpha: this.alpha, rDegPerSec: this.rDegPerSec };
  }

  /**
   * One training sample from two consecutive released measurements.
   * @param thetaK measured angle at tick k, @param thetaK1 measured angle at tick k+1,
   * @param uK command in force at tick k, @param dtMs time between the samples.
   */
  observe(thetaK: number, thetaK1: number, uK: number, dtMs: number): void {
    if (Math.abs(dtMs - TICK_MS) > 1e-6) {
      this.skipped++;
      return;
    }
    const x = uK - thetaK;
    const y = thetaK1 - thetaK;
    const maxStep = this.rDegPerSec * DT_SEC;

    // Speed estimate from clearly saturated steps.
    if (Math.abs(x) >= this.cfg.saturatedErrorDeg && Math.sign(y) === Math.sign(x)) {
      this.speeds.push(Math.abs(y) / DT_SEC);
      if (this.speeds.length > this.cfg.speedWindow) this.speeds.shift();
      if (this.speeds.length >= 5) {
        const sorted = [...this.speeds].sort((a, b) => a - b);
        this.rDegPerSec = sorted[Math.floor(sorted.length / 2)];
        this.speedUpdates++;
      }
    }

    // RLS alpha update, only in the clearly unsaturated, above-noise regime.
    const unsaturated = Math.abs(this.alpha * x) < this.cfg.unsaturatedMargin * maxStep;
    if (Math.abs(x) < this.cfg.noiseFloorDeg || !unsaturated) {
      this.skipped++;
      return;
    }
    const K = (this.P * x) / (this.cfg.lambda + x * x * this.P);
    this.alpha = clamp(this.alpha + K * (y - x * this.alpha), this.cfg.alphaMin, this.cfg.alphaMax);
    this.P = clamp((this.P - K * x * this.P) / this.cfg.lambda, this.cfg.Pmin, this.cfg.Pmax);
    this.alphaUpdates++;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
