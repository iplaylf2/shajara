import type { REF_TOKEN, RELIC_TOKEN } from "./token";
import type { Failure } from "./failure";

export type ProcessRefRelic<Ref extends ProcessRef<unknown>> =
  Ref extends ProcessRef<infer Relic> ? Relic : never;

export type ProcessExit<Relic> =
  | ProcessCompletedExit<Relic>
  | ProcessFailedExit
  | ProcessTerminatedExit;

export interface ProcessRef<Relic> {
  readonly [REF_TOKEN]: "process";
  readonly [RELIC_TOKEN]?: readonly [Relic];
}

export interface ProcessCompletedExit<Relic> {
  readonly kind: "completed";
  readonly value: Relic;
}

export interface ProcessFailedExit {
  readonly kind: "failed";
  readonly failure: Failure;
}

export interface ProcessTerminatedExit {
  readonly kind: "terminated";
}

export interface Processor {
  readonly kind: "processor";
}
