import type { Failure } from "#src/contracts";

export function scopeTerminated(): ScopeTerminatedFailure {
  return {
    kind: "scope-terminated",
    message(): string {
      return "Scope terminated before completion";
    },
  };
}

export interface ScopeTerminatedFailure extends Failure {
  readonly kind: "scope-terminated";
}
