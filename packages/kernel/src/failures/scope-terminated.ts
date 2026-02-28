import type { KhoraFailure, ScopeRef } from "#src/contracts";

export function scopeTerminated(scopeRef: ScopeRef<unknown>): ScopeTerminatedFailure {
  return {
    kind: "scope-terminated",
    message(): string {
      return "Scope terminated before completion";
    },
    scopeRef,
  };
}

export interface ScopeTerminatedFailure extends KhoraFailure {
  readonly kind: "scope-terminated";
  readonly scopeRef: ScopeRef<unknown>;
}
