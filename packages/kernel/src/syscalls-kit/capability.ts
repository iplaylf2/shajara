import type { ScopeRef } from "#src/scope";

const CAPABILITY_REF_TOKEN: unique symbol = Symbol("capability-ref");

export interface CapabilityRef<Methods extends string = string, Scope extends ScopeRef = ScopeRef> {
  readonly [CAPABILITY_REF_TOKEN]: "capability-ref";
  readonly scope: Scope;
  readonly methods?: readonly Methods[];
}

export interface CallDescriptor<Method extends string = string> {
  readonly method: Method;
  readonly args: readonly unknown[];
}
