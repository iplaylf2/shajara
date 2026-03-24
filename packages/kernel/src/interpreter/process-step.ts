import type { FutureResult, ProcessRef } from "#/contracts";

export type ProcessStep<Relic> =
  | ProcessWaitingStep<Relic>
  | ProcessCededStep<Relic>
  | ProcessInterpretedStep<Relic>
  | ProcessResonatedStep<Relic>
  | ProcessExitedStep<Relic>;

export interface ProcessWaitingStep<Relic> {
  readonly disposition: "waiting";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessCededStep<Relic> {
  readonly disposition: "ceded";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessInterpretedStep<Relic> {
  readonly disposition: "interpreted";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessResonatedStep<Relic> {
  readonly disposition: "resonated";
  readonly process: ProcessRef<Relic>;
}

export interface ProcessExitedStep<Relic> {
  readonly disposition: "exited";
  readonly process: ProcessRef<Relic>;
  readonly result: FutureResult<Relic>;
}

export function processWaitingStep<Relic>(process: ProcessRef<Relic>): ProcessWaitingStep<Relic> {
  return { disposition: "waiting", process };
}

export function processCededStep<Relic>(process: ProcessRef<Relic>): ProcessCededStep<Relic> {
  return { disposition: "ceded", process };
}

export function processInterpretedStep<Relic>(
  process: ProcessRef<Relic>,
): ProcessInterpretedStep<Relic> {
  return { disposition: "interpreted", process };
}

export function processResonatedStep<Relic>(
  process: ProcessRef<Relic>,
): ProcessResonatedStep<Relic> {
  return { disposition: "resonated", process };
}

export function processExitedStep<Relic>(
  process: ProcessRef<Relic>,
  result: FutureResult<Relic>,
): ProcessExitedStep<Relic> {
  return { disposition: "exited", process, result };
}
