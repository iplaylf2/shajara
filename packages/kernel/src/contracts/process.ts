import type { KhoraFailure } from "./failure";
import { REF_TOKEN } from "#src/utils";

export interface ProcessRef<Return> {
  readonly [REF_TOKEN]: "process";
  readonly return?: readonly [Return];
}

export type ProcessRefReturn<Ref extends ProcessRef<unknown>> =
  Ref extends ProcessRef<infer Return> ? Return : never;

export interface ProcessCompletedExit<Return> {
  readonly kind: "completed";
  readonly value: Return;
}

export interface ProcessFailedExit {
  readonly kind: "failed";
  readonly fault: KhoraFailure;
}

export interface ProcessTerminatedExit {
  readonly kind: "terminated";
}

export type ProcessExit<Return> =
  | ProcessCompletedExit<Return>
  | ProcessFailedExit
  | ProcessTerminatedExit;
