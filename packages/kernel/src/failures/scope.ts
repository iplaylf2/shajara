import type { FailureShape } from "#/contracts";

export function scopeFailure(
  cause: FailureShape,
  suppressed: readonly FailureShape[],
): ScopeFailure {
  return {
    cause,
    kind: "scope",
    message: "Scope failed during closing",
    suppressed,
  };
}

export interface ScopeFailure extends FailureShape {
  readonly cause: FailureShape;
  readonly suppressed: readonly FailureShape[];
  readonly kind: "scope";
}
