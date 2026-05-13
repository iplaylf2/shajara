import type { FailureShape } from "#/contracts";

/**
 * Returns an in-band failure for execution interrupted outside normal convergence.
 *
 * @param cause - Out-of-band value that interrupted progression.
 * @returns Interrupted failure value.
 */
export function interruptedFailure(cause: unknown): InterruptedFailure {
  return {
    cause,
    kind: "interrupted",
    message: "Scope progression was interrupted by an out-of-band failure",
  };
}

/** Failure value for execution interrupted outside normal convergence. */
export interface InterruptedFailure extends FailureShape {
  /** Out-of-band cause that interrupted execution. */
  readonly cause: unknown;
  readonly kind: "interrupted";
}
