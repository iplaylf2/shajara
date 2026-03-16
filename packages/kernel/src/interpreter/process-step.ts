import type { FailureShape, FutureResult, ProcessRef } from "#src/contracts";

export type ProcessStep<Relic> =
  | ProcessStepBlocked<Relic>
  | ProcessStepCeded<Relic>
  | ProcessStepInterpreted<Relic>
  | ProcessStepResonated<Relic>
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

export interface ProcessStepInterpreted<Relic> {
  readonly kind: "interpreted";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessStepResonated<Relic> {
  readonly kind: "resonated";
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

export function blockedProcessStep<Relic>(process: ProcessRef<Relic>): ProcessStepBlocked<Relic> {
  return { kind: "blocked", process };
}

export function cededProcessStep<Relic>(process: ProcessRef<Relic>): ProcessStepCeded<Relic> {
  return { kind: "ceded", process };
}

export function interpretedProcessStep<Relic>(
  process: ProcessRef<Relic>,
): ProcessStepInterpreted<Relic> {
  return { kind: "interpreted", process };
}

export function resonatedProcessStep<Relic>(
  process: ProcessRef<Relic>,
): ProcessStepResonated<Relic> {
  return { kind: "resonated", process };
}

export function completedProcessStep<Relic>(
  process: ProcessRef<Relic>,
  value: Relic,
): ProcessStepCompleted<Relic> {
  return { kind: "completed", process, value };
}

export function exitedProcessStep<Relic>(
  process: ProcessRef<Relic>,
  result: FutureResult<Relic>,
): ProcessStepExited<Relic> {
  return { kind: "exited", process, result };
}

export function failedProcessStep<Relic>(
  process: ProcessRef<Relic>,
  failure: FailureShape,
): ProcessStepFailed<Relic> {
  return { failure, kind: "failed", process };
}
