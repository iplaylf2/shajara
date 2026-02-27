import type { KhoraFailure } from "./failure";

const SCOPE_REF_TOKEN: unique symbol = Symbol("scope-ref");

export interface ScopeRef<Return> {
  readonly [SCOPE_REF_TOKEN]: "scope-ref";
  readonly _return?: Return;
}

export interface ScopeSpec {
  readonly role: string;
}

export interface ScopeTerminatedFailure extends KhoraFailure {
  readonly kind: "scope-terminated";
  readonly scopeRef: ScopeRef<unknown>;
}

export function scopeTerminated(scopeRef: ScopeRef<unknown>): ScopeTerminatedFailure {
  return {
    kind: "scope-terminated",
    message(): string {
      return "Scope terminated before completion";
    },
    scopeRef,
  };
}
