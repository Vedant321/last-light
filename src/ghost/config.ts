// Shared constants (handbook v2, section 5.3). Freeze these before evaluation runs.

export const UPLINK_MS = 1_300; // command travel time
export const DOWNLINK_MS = 1_300; // added video delay
export const TICK_MS = 20; // fixed simulation/control step (50 Hz)
export const FUTURE_EXTRA_MS = 400; // future-aim horizon = UPLINK_MS + FUTURE_EXTRA_MS
export const PAN_LIMIT_DEG = 30;
export const ALIGN_TOL_DEG = 2; // widen (and disclose) on the rig if calibration can't support ±2°
export const ALIGN_HOLD_MS = 1_000;
export const MAX_SAMPLE_GAP_MS = 100;
export const TRIAL_TIMEOUT_MS = 60_000;
export const KNOB_SIGN = 1; // set so clockwise = right

export function clampAngle(angleDeg: number): number {
  return Math.max(-PAN_LIMIT_DEG, Math.min(PAN_LIMIT_DEG, angleDeg));
}

/** Knob raw (0..1023) → integer command angle. The SAME integer is sent, logged and used by the models. */
export function knobToAngle(raw: number): number {
  const mapped = KNOB_SIGN * ((60 * raw) / 1023 - 30);
  return Math.max(-PAN_LIMIT_DEG, Math.min(PAN_LIMIT_DEG, Math.round(mapped)));
}

/** On-screen slider / keyboard value → integer command angle (same quantization as the knob). */
export function toCommandAngle(angleDeg: number): number {
  return Math.round(clampAngle(angleDeg));
}
