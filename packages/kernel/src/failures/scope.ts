import type { FailureShape } from "#/contracts";

/**
 * Creates the failure value for a scope that failed while closing.
 *
 * @param cause - Primary failure that caused the scope to fail.
 * @param suppressed - Additional failures captured while the scope was already failing.
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

/** Failure value reported when a scope fails while closing. */
export interface ScopeFailure extends FailureShape {
  /** Primary failure that caused the scope to fail. */
  readonly cause: FailureShape;
  /** Additional failures captured after the scope began failing. */
  readonly suppressed: readonly FailureShape[];
  readonly kind: "scope";
}
