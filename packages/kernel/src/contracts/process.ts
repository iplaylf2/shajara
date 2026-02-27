import type { REF_TOKEN, RETURN_TOKEN } from "#src/utils";
import type { KhoraFailure } from "./failure";

export interface ProcessRef<Return> {
  readonly [REF_TOKEN]: "process";
  readonly [RETURN_TOKEN]?: readonly [Return];
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
