import type { FutureKey } from "./future-key.js";
import type { REF_TOKEN } from "./token.js";
import type { ScopeDescriptor } from "./descriptor.js";

/** Reference to one scope and its exit future. */
export interface ScopeRef<Value, Descriptor extends ScopeDescriptor = ScopeDescriptor> {
  readonly [REF_TOKEN]: "scope";
  readonly descriptor: Descriptor;
  /** Scope exit result; its failure side is limited to cancellation or scope failure. */
  readonly exitFuture: FutureKey<Value>;
}
