import type { FailureShape } from "#/contracts";

/**
 * Scope exit failure value.
 *
 * @param cause - Primary failure.
 * @param suppressed - Additional failures.
 * @returns Scope failure.
 */
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

/** Failure emitted when a scope converges through its local failure path. */
export interface ScopeFailure extends FailureShape {
  readonly cause: FailureShape;
  readonly suppressed: readonly FailureShape[];
  readonly kind: "scope";
}
