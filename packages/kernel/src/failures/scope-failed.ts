import type { FailureShape, ProcessRef } from "#src/contracts";
import type { Failure } from "./index";

export function scopeFailed(
  causeProcess: ProcessRef<unknown>,
  cause: Failure,
  closingFailures: readonly FailureShape[],
): ScopeFailure {
  return {
    cause,
    causeProcess,
    closingFailures,
    kind: "scope-failed",
    message() {
      return "Scope failed during closing";
    },
  };
}

export interface ScopeFailure extends FailureShape {
  readonly cause: Failure;
  readonly causeProcess: ProcessRef<unknown>;
  readonly closingFailures: readonly FailureShape[];
  readonly kind: "scope-failed";
}
