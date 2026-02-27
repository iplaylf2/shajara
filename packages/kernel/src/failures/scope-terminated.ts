import type { KhoraFailure } from "#src/contracts/failure";
import type { ScopeRef } from "#src/contracts/scope";

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
