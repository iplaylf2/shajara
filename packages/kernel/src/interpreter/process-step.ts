import type { FailureShape, FutureResult, ProcessRef } from "#src/contracts";

export type ProcessStep<Relic> =
  | ProcessStepBlocked<Relic>
  | ProcessStepCeded<Relic>
  | ProcessStepCompleted<Relic>
  | ProcessStepExited<Relic>
  | ProcessStepFailed<Relic>;

export interface ProcessStepBlocked<Relic> {
  readonly kind: "blocked";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessStepCeded<Relic> {
  readonly kind: "ceded";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessStepCompleted<Relic> {
  readonly kind: "completed";
  readonly process: ProcessRef<Relic>;
  readonly value: Relic;
}

export interface ProcessStepExited<Relic> {
  readonly kind: "exited";
  readonly process: ProcessRef<Relic>;
  readonly result: FutureResult<Relic>;
}

export interface ProcessStepFailed<Relic> {
  readonly failure: FailureShape;
  readonly kind: "failed";
  readonly process: ProcessRef<Relic>;
}
