import type { FailureShape } from "#/contracts";

/**
 * Returns the failure value for a scope's local failure convergence.
 *
 * @param cause - Primary failure that drove the scope into failure convergence.
 * @param suppressed - Additional failures captured while the scope was already failing.
 * @returns Scope failure value.
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

/** Failure value reported when a scope converges through local failure convergence. */
export interface ScopeFailure extends FailureShape {
  /** Primary failure that drove the scope into failure convergence. */
  readonly cause: FailureShape;
  /** Additional failures captured after failure convergence began. */
  readonly suppressed: readonly FailureShape[];
  readonly kind: "scope";
}
