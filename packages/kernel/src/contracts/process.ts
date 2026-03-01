import type { REF_TOKEN, RETURN_TOKEN } from "#src/utils";
import type { Failure } from "./failure";

export type ProcessRefReturn<Ref extends ProcessRef<unknown>> =
  Ref extends ProcessRef<infer Return> ? Return : never;

export type ProcessExit<Return> =
  | ProcessCompletedExit<Return>
  | ProcessFailedExit
  | ProcessTerminatedExit;

export interface ProcessRef<Return> {
  readonly [REF_TOKEN]: "process";
  readonly [RETURN_TOKEN]?: readonly [Return];
}

export interface ProcessCompletedExit<Return> {
  readonly kind: "completed";
  readonly value: Return;
}

export interface ProcessFailedExit {
  readonly kind: "failed";
  readonly fault: Failure;
}

export interface ProcessTerminatedExit {
  readonly kind: "terminated";
}
