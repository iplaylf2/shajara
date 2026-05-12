import type { FutureKey } from "./future-key";
import type { REF_TOKEN } from "./token";
import type { ScopeDescriptor } from "./descriptor";

export interface ScopeRef<Value, Descriptor extends ScopeDescriptor = ScopeDescriptor> {
  readonly [REF_TOKEN]: "scope";
  readonly descriptor: Descriptor;
  /**
   * Scope exit futures expose only scope failures or cancellation failures on the left side.
   */
  readonly exitFuture: FutureKey<Value>;
}
