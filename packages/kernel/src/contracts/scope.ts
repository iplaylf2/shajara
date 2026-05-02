import type { FutureKey } from "./future-key";
import type { REF_TOKEN } from "./token";
import type { ScopeDescriptor } from "./descriptor";

export interface ScopeRef<Value, Descriptor extends ScopeDescriptor = ScopeDescriptor> {
  readonly [REF_TOKEN]: "scope";
  readonly descriptor: Descriptor;
  readonly exitFuture: FutureKey<Value>;
}
