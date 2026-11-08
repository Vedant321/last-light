import { DOWNLINK_MS, TRIAL_TIMEOUT_MS } from '../config';
import type { Condition, TrialOrder, TrialResult } from '../types';
import { TargetEvaluator } from './evaluator';

export interface Acquisition { target: number; tAcquired: number; tNotified: number }
export interface ScoredTrial extends TrialResult {
  sessionId: string; participant: number; practice: boolean; modelKind: string;
  startedAt: number; endedAt: number; notifiedAt: number | null;
  reversals: number; acquisitions: Acquisition[];
}
export function pairPlan(participant: number): { order: TrialOrder; conditions: Condition[]; targets: number[] } {
  return { order: participant % 2 ? 'AB' : 'BA',
    conditions: participant % 2 ? ['LAG_ONLY', 'PREDICTION'] : ['PREDICTION', 'LAG_ONLY'],
    targets: participant % 2 ? [-20, 20] : [20, -20] };
}

/** Reference state is private; operator-facing state changes only at notification time. */
export class TrialRunner {
  private evaluator: TargetEvaluator;
  private index = 0;
  private pending: Acquisition | null = null;
  private terminal: ScoredTrial | null = null;
  private acquisitions: Acquisition[] = [];
  private overshoots = 0;
  private reversals = 0;
  constructor(private readonly meta: Omit<ScoredTrial, 'outcome' | 'timeMs' | 'perTargetMs' | 'overshoots' | 'reversals' | 'acquisitions' | 'endedAt' | 'notifiedAt'>) {
    this.evaluator = new TargetEvaluator(meta.targetSequence[0], meta.startedAt);
  }
  get activeTarget(): number | null { return this.terminal && this.terminal.notifiedAt !== null ? null : this.meta.targetSequence[this.index]; }
  sample(t: number, angle: number | null): void {
    if (this.terminal || this.pending || t > this.meta.startedAt + TRIAL_TIMEOUT_MS) return;
    const at = this.evaluator.sample(t, angle);
    if (at !== null) {
      this.overshoots += this.evaluator.overshoots;
      this.reversals += this.evaluator.reversals;
      this.pending = { target: this.meta.targetSequence[this.index], tAcquired: at, tNotified: at + DOWNLINK_MS };
    }
  }
  /** Call before samples on every tick; this makes transitions independent of frame rate. */
  advance(t: number): ScoredTrial | null {
    if (this.pending && t >= this.pending.tNotified) {
      this.acquisitions.push(this.pending);
      if (this.index === this.meta.targetSequence.length - 1) this.finish('SUCCESS', this.pending.tAcquired);
      else { this.index++; this.evaluator = new TargetEvaluator(this.meta.targetSequence[this.index], this.pending.tNotified); }
      this.pending = null;
    }
    if (!this.terminal && t > this.meta.startedAt + TRIAL_TIMEOUT_MS && !this.pending) {
      this.overshoots += this.evaluator.overshoots;
      this.reversals += this.evaluator.reversals;
      this.finish('TIMEOUT', this.meta.startedAt + TRIAL_TIMEOUT_MS);
    }
    if (this.terminal && t >= this.terminal.endedAt + DOWNLINK_MS) {
      this.terminal.notifiedAt ??= this.terminal.endedAt + DOWNLINK_MS;
      return this.terminal;
    }
    return null;
  }
  invalidate(t: number, reason: string): ScoredTrial {
    this.finish('INVALID', t);
    this.terminal!.invalidReason = reason;
    this.terminal!.notifiedAt = t;
    return this.terminal!;
  }
  private finish(outcome: ScoredTrial['outcome'], t: number): void {
    this.terminal = { ...this.meta, outcome, endedAt: t, notifiedAt: null,
      timeMs: outcome === 'SUCCESS' ? t - this.meta.startedAt : null,
      perTargetMs: this.acquisitions.map((a, i) => a.tAcquired - (i ? this.acquisitions[i - 1].tNotified : this.meta.startedAt)),
      overshoots: this.overshoots, reversals: this.reversals, acquisitions: [...this.acquisitions] };
  }
}
