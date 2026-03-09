import type { Failure } from "./failure";
import type { FutureKey } from "./future-key";
import type { REF_TOKEN } from "./token";
import type { Right } from "#src/utils";

export interface ScopeRef<Value> {
  readonly [REF_TOKEN]: "scope";
  readonly exitFuture: FutureKey<Right<ScopeExit<Value>>>;
}

export interface ScopeSpec {
  readonly role: string;
}

export type ScopeExit<Value> = ScopeCompletedExit<Value> | ScopeFailedExit | ScopeTerminatedExit;

export interface ScopeCompletedExit<Value> {
  readonly kind: "completed";
  readonly value: Value;
}

export interface ScopeFailedExit {
  readonly kind: "failed";
  readonly failure: Failure;
}

export interface ScopeTerminatedExit {
  readonly kind: "terminated";
}
