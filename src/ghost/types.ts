// Shared contracts for the pan-camera Light Delay app (handbook v2, section 5.4).
// Conventions (5.3): degrees + milliseconds from one Clock; positive angle = camera pans RIGHT;
// a command is an ABSOLUTE integer target angle in [-PAN_LIMIT_DEG, +PAN_LIMIT_DEG].

export interface Clock {
  now(): number;
}

export interface Command {
  sessionId: string;
  id: number;
  /** When the operator issued it. */
  tIssued: number;
  /** tIssued + UPLINK_MS: when it reaches the machine. */
  tScheduled: number;
  /** Integer target angle actually sent and logged. */
  angleDeg: number;
}

export type TimestampSource = "SIM" | "CAPTURE" | "ESTIMATED";

export interface Observation {
  sessionId: string;
  id: number;
  /** When the camera angle was true (estimated on the rig). */
  tSample: number;
  /** When the app received it. */
  tReceived: number;
  /** When the operator may see it (tReceived + DOWNLINK_MS). */
  tDeliver: number;
  timestampSource: TimestampSource;
  timestampUncertaintyMs: number;
  /** null when tracking is lost. */
  angleDeg: number | null;
  valid: boolean;
  markerIds: number[];
  /** Image lives in a frame store, never in logs. */
  frameId?: number;
}

export type PredictionKind = "NOW" | "FUTURE";

export interface Prediction {
  id: number;
  sourceObservationId: number;
  modelVersion: number;
  kind: PredictionKind;
  tMade: number;
  tFor: number;
  angleDeg: number;
  lastCommandId: number;
  /** null = warming up or stale. */
  errorBandDeg: number | null;
}

export interface PlantDriver {
  start(onObservation: (o: Observation) => void): Promise<void>;
  applyCommand(command: Command, tDispatch: number): Promise<void>;
  /** SIM advances physics; RIG does nothing. */
  step(tNow: number): void;
  reset(): Promise<void>;
  dispose(): Promise<void>;
}

export interface Predictor {
  reset(): void;
  onIssuedCommand(command: Command): void;
  /** Only called with observations already released through the downlink. */
  onReleasedObservation(observation: Observation): void;
  predict(tNow: number): readonly Prediction[];
}

export type Condition = "LAG_ONLY" | "PREDICTION";
export type TrialOrder = "AB" | "BA";
export type PlantMode = "SIM" | "RIG";

export interface TrialResult {
  trialId: string;
  condition: Condition;
  order: TrialOrder;
  plant: PlantMode;
  tester: string;
  targetSequence: number[];
  outcome: "SUCCESS" | "TIMEOUT" | "INVALID";
  invalidReason?: string;
  timeMs: number | null;
  perTargetMs: number[];
  overshoots: number;
}
