import type { FailureShape, ProcessRef, ScopeRef } from "#/contracts";

export function scopeFailure(
  cause: ScopeFailureCause,
  suppressed: readonly FailureShape[],
): ScopeFailure {
  return {
    cause,
    kind: "scope",
    get message(): string {
      return "Scope failed during closing";
    },
    suppressed: suppressed,
  };
}

export interface ScopeFailure extends FailureShape {
  readonly cause: ScopeFailureCause;
  readonly suppressed: readonly FailureShape[];
  readonly kind: "scope";
}

export type ScopeFailureCause = ProcessCause | ScopeCause;

export interface ProcessCause {
  readonly failure: FailureShape;
  readonly kind: "process";
  readonly process: ProcessRef<unknown>;
}

export interface ScopeCause {
  readonly failure: FailureShape;
  readonly kind: "scope";
  readonly scope: ScopeRef<unknown>;
}
