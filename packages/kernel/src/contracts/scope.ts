import type { FutureKey } from "./future-key";
import type { REF_TOKEN } from "./token";

export interface ScopeRef<Value> {
  readonly [REF_TOKEN]: "scope";
  readonly exitFuture: FutureKey<Value>;
}

export type FailureMode = "propagate" | "contain";

export interface ScopeDescriptor {
  readonly failureMode: FailureMode;
}
