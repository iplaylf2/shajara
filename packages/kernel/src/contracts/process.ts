import type { Failure } from "./failure";
import type { FutureKey } from "./future-key";
import type { REF_TOKEN } from "./token";
import type { Right } from "#src/utils";

export interface ProcessRef<Value> {
  readonly [REF_TOKEN]: "process";
  readonly exitFuture: FutureKey<Right<ProcessExit<Value>>>;
}

export type ProcessExit<Value> =
  | ProcessCompletedExit<Value>
  | ProcessFailedExit
  | ProcessTerminatedExit;

export interface ProcessCompletedExit<Value> {
  readonly kind: "completed";
  readonly value: Value;
}

export interface ProcessFailedExit {
  readonly kind: "failed";
  readonly failure: Failure;
}

export interface ProcessTerminatedExit {
  readonly kind: "terminated";
}
