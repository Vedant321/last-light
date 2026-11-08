// Predictor (handbook v2, 5.8). Inputs: issued commands + RELEASED observations only.
// It never sees the plant, its parameters, or the evaluator's truth.
//
// - Estimated now θ̂(t): start from the latest valid released observation (sample time s),
//   replay ticks from s to t using only commands already applied at the machine
//   (tScheduled <= tick time). Commands still in flight cannot affect it.
// - Future aim: same replay to t + UPLINK_MS + FUTURE_EXTRA_MS, which includes every
//   issued command at its scheduled time and then holds the latest ("assuming no further input").
import { FUTURE_EXTRA_MS, UPLINK_MS } from "../config";
import type { Command, Observation } from "../types";
import type { OnlineServoLearner } from "./learner";
import { commandInForce, stepServo, tickAtOrBefore, tickTime, type ServoParams } from "./model";

/** Starting guess for the fixed model ("calibrated" before the run; deliberately not the hidden truth). */
export const FIXED_GUESS: ServoParams = { alpha: 0.14, rDegPerSec: 85 };

export class PanPredictor {
  private commands: Command[] = [];
  private latest: Observation | null = null;
  params: ServoParams;
  /** When set, the predictor trains this learner on released data and uses its parameters. */
  learner: OnlineServoLearner | null;

  constructor(params: ServoParams = FIXED_GUESS, learner: OnlineServoLearner | null = null) {
    this.params = { ...params };
    this.learner = learner;
    if (learner) this.params = learner.params();
  }

  /** "fixed" = frozen starting guess; "adaptive" = learned online (RLS). */
  get modelKind(): "fixed" | "adaptive" {
    return this.learner ? "adaptive" : "fixed";
  }

  reset(): void {
    this.commands = [];
    this.latest = null;
  }

  onIssuedCommand(command: Command): void {
    this.commands.push(command);
    this.commands.sort((a, b) => a.tScheduled - b.tScheduled || a.id - b.id);
  }

  onReleasedObservation(o: Observation): void {
    if (!o.valid || o.angleDeg === null) return;
    if (this.latest && o.tSample <= this.latest.tSample) return;
    // Train BEFORE pruning, so the command in force at the previous sample is still known.
    if (this.learner && this.latest && this.latest.angleDeg !== null) {
      const uPrev = commandInForce(this.commands, this.latest.tSample, 0);
      this.learner.observe(this.latest.angleDeg, o.angleDeg, uPrev, o.tSample - this.latest.tSample);
      this.params = this.learner.params();
    }
    this.latest = o;
    // Prune: keep the last command applied at/before s (it is still "held") and everything after.
    let lastApplied = -1;
    for (let i = 0; i < this.commands.length; i++) {
      if (this.commands[i].tScheduled <= o.tSample) lastApplied = i;
      else break;
    }
    if (lastApplied > 0) this.commands = this.commands.slice(lastApplied);
  }

  /** Latest released observation (what the operator's delayed video is based on). */
  latestObservation(): Observation | null {
    return this.latest;
  }

  /** Estimated camera angle now (null until the first observation is released). */
  estimateNow(t: number): number | null {
    return this.projectTo(t);
  }

  /** Future aim at t + UPLINK_MS + FUTURE_EXTRA_MS, assuming no further input. */
  futureAim(t: number): number | null {
    return this.projectTo(t + UPLINK_MS + FUTURE_EXTRA_MS);
  }

  /** Latest commanded (destination) angle: NOT a learned prediction. */
  latestCommandAngle(): number | null {
    return this.commands.length ? this.commands[this.commands.length - 1].angleDeg : null;
  }

  private projectTo(tTarget: number): number | null {
    const obs = this.latest;
    if (!obs || obs.angleDeg === null) return null;
    let k = tickAtOrBefore(obs.tSample);
    const kEnd = tickAtOrBefore(tTarget);
    let theta = obs.angleDeg;
    // Before any command the machine holds its start position (0°, the calibrated forward direction).
    let u = commandInForce(this.commands, tickTime(k), 0);
    let ci = 0;
    // Advance ci past commands already in force at tick k.
    while (ci < this.commands.length && this.commands[ci].tScheduled <= tickTime(k)) ci++;
    while (k < kEnd) {
      theta = stepServo(theta, u, this.params);
      k += 1;
      const T = tickTime(k);
      while (ci < this.commands.length && this.commands[ci].tScheduled <= T) {
        u = this.commands[ci].angleDeg;
        ci++;
      }
    }
    return theta;
  }
}
