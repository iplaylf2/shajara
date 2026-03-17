import type { FutureResult, ProcessRef } from "#src/contracts";

export type ProcessStage<Relic> =
  | ProcessBlocked<Relic>
  | ProcessCeded<Relic>
  | ProcessInterpreted<Relic>
  | ProcessResonated<Relic>
  | ProcessExited<Relic>;

export interface ProcessBlocked<Relic> {
  readonly kind: "blocked";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessCeded<Relic> {
  readonly kind: "ceded";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessInterpreted<Relic> {
  readonly kind: "interpreted";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessResonated<Relic> {
  readonly kind: "resonated";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessExited<Relic> {
  readonly kind: "exited";
  readonly process: ProcessRef<Relic>;
  readonly result: FutureResult<Relic>;
}

export function blockedProcessStage<Relic>(process: ProcessRef<Relic>): ProcessBlocked<Relic> {
  return { kind: "blocked", process };
}

export function cededProcessStage<Relic>(process: ProcessRef<Relic>): ProcessCeded<Relic> {
  return { kind: "ceded", process };
}

export function interpretedProcessStage<Relic>(
  process: ProcessRef<Relic>,
): ProcessInterpreted<Relic> {
  return { kind: "interpreted", process };
}

export function resonatedProcessStage<Relic>(process: ProcessRef<Relic>): ProcessResonated<Relic> {
  return { kind: "resonated", process };
}

export function exitedProcessStage<Relic>(
  process: ProcessRef<Relic>,
  result: FutureResult<Relic>,
): ProcessExited<Relic> {
  return { kind: "exited", process, result };
}
