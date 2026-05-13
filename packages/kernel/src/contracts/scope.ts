import type { FutureKey } from "./future-key";
import type { REF_TOKEN } from "./token";
import type { ScopeDescriptor } from "./descriptor";

/** Control reference for one scope and its convergence future. */
export interface ScopeRef<Value, Descriptor extends ScopeDescriptor = ScopeDescriptor> {
  readonly [REF_TOKEN]: "scope";
  readonly descriptor: Descriptor;
  /** Scope convergence result; its failure side is limited to cancellation or scope failure. */
  readonly exitFuture: FutureKey<Value>;
}
