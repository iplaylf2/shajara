import type { FailureShape } from "#src/contracts";

export function scopeTerminated(): ScopeTerminatedFailure {
  return {
    kind: "scope-terminated",
    message(): string {
      return "Scope terminated before completion";
    },
  };
}

export interface ScopeTerminatedFailure extends FailureShape {
  readonly kind: "scope-terminated";
}
