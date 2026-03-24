import type { FailureShape, ProcessRef, ScopeRef } from "#/contracts";

export function scopeFailure(
  cause: ScopeFailureCause,
  suppressedFailures: readonly FailureShape[],
): ScopeFailure {
  return {
    cause,
    kind: "scope-failed",
    message() {
      return "Scope failed during closing";
    },
    suppressedFailures,
  };
}

export interface ScopeFailure extends FailureShape {
  readonly cause: ScopeFailureCause;
  readonly suppressedFailures: readonly FailureShape[];
  readonly kind: "scope-failed";
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
