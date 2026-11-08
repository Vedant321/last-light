// Servo motion model (handbook v2, 5.7). The SAME functional form is used by the
// simulated plant (with hidden "true" parameters) and by the predictor (with its
// own estimated parameters). The predictor never sees the plant's parameters.
import { TICK_MS } from "../config";
import type { Command } from "../types";

export interface ServoParams {
  /** Fraction of the remaining error closed per 20 ms tick (0..1). Defined for TICK_MS = 20. */
  alpha: number;
  /** Maximum turning speed, degrees per second. */
  rDegPerSec: number;
}

export const DT_SEC = TICK_MS / 1000;

/** One fixed 20 ms step toward the applied absolute target angle `u`. */
export function stepServo(theta: number, u: number, p: ServoParams): number {
  const maxStep = p.rDegPerSec * DT_SEC;
  const desired = p.alpha * (u - theta);
  return theta + Math.max(-maxStep, Math.min(maxStep, desired));
}

/**
 * Tick grid shared by plant and predictor: tick k happens at time k * TICK_MS.
 * Ordering at tick k: (1) the command in force is the last one with tScheduled <= T_k,
 * (2) the observation at T_k reports theta_k, (3) theta_{k+1} = stepServo(theta_k, u_k).
 */
export const tickAtOrBefore = (t: number): number => Math.floor(t / TICK_MS);
export const tickTime = (k: number): number => k * TICK_MS;

/** Commands must be sorted by tScheduled. Returns the angle in force at time T (or `fallback`). */
export function commandInForce(commands: readonly Command[], T: number, fallback: number): number {
  let u = fallback;
  for (const c of commands) {
    if (c.tScheduled <= T) u = c.angleDeg;
    else break;
  }
  return u;
}
