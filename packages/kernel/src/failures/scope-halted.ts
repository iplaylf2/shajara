import type { FailureShape } from "#src/contracts";

export function scopeHalted(): ScopeHaltedFailure {
  return {
    kind: "scope-halted",
    message(): string {
      return "Scope halted";
    },
  };
}

export interface ScopeHaltedFailure extends FailureShape {
  readonly kind: "scope-halted";
}
