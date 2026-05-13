import type { FutureKey } from "./future-key";
import type { REF_TOKEN } from "./token";
import type { ScopeDescriptor } from "./descriptor";

/** Control reference for a scope and its convergence future. */
export interface ScopeRef<Value, Descriptor extends ScopeDescriptor = ScopeDescriptor> {
  readonly [REF_TOKEN]: "scope";
  readonly descriptor: Descriptor;
  /** Left-side scope results are limited to cancellation and scope failure. */
  readonly exitFuture: FutureKey<Value>;
}
