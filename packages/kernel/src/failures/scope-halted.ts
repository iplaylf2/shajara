import type { Failure } from "#src/contracts";

export function scopeHalted(): ScopeHaltedFailure {
  return {
    kind: "scope-halted",
    message(): string {
      return "Scope halted";
    },
  };
}

export interface ScopeHaltedFailure extends Failure {
  readonly kind: "scope-halted";
}
