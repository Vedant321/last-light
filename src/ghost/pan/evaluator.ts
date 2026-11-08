import { ALIGN_HOLD_MS, ALIGN_TOL_DEG, MAX_SAMPLE_GAP_MS, TRIAL_TIMEOUT_MS } from '../config';

/** Private reference samples only. No predictor or command dependency. */
export class TargetEvaluator {
  private hold: number | null = null;
  private last: number | null = null;
  private side = 0;
  private direction = 0;
  private previousAngle: number | null = null;
  overshoots = 0;
  reversals = 0;
  acquiredAt: number | null = null;
  constructor(readonly target: number, readonly start: number) {}
  sample(t: number, angle: number | null): number | null {
    if (t < this.start || (this.last !== null && t <= this.last) || this.acquiredAt !== null) return null;
    if (this.last !== null && t - this.last > MAX_SAMPLE_GAP_MS) this.breakTracking();
    this.last = t;
    if (angle === null || !Number.isFinite(angle)) { this.breakTracking(); return null; }
    const side = angle < this.target - ALIGN_TOL_DEG ? -1 : angle > this.target + ALIGN_TOL_DEG ? 1 : 0;
    if (side) {
      if (this.side && side !== this.side) this.overshoots++;
      this.side = side;
      this.hold = null;
    } else {
      this.hold ??= t;
      if (t - this.hold >= ALIGN_HOLD_MS) this.acquiredAt = t;
    }
    if (this.previousAngle !== null) {
      const delta = angle - this.previousAngle;
      // Ignore sub-millidegree numerical settling; reversals describe reference motion.
      if (Math.abs(delta) >= 0.001) {
        const direction = Math.sign(delta);
        if (this.direction && direction !== this.direction) this.reversals++;
        this.direction = direction;
      }
    }
    this.previousAngle = angle;
    return this.acquiredAt;
  }
  timedOut(t: number): boolean { return this.acquiredAt === null && t >= this.start + TRIAL_TIMEOUT_MS; }
  private breakTracking(): void {
    this.hold = null; this.side = 0; this.direction = 0; this.previousAngle = null;
  }
}
