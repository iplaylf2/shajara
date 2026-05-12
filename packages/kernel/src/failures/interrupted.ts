import type { FailureShape } from "#/contracts";

/**
 * Failure value for interrupted runtime progression.
 *
 * @param cause - Interruption cause.
 * @returns Interrupted failure.
 */
export function interruptedFailure(cause: unknown): InterruptedFailure {
  return {
    cause,
    kind: "interrupted",
    message: "Scope progression was interrupted by an out-of-band failure",
  };
}

/** Failure emitted when runtime progression is interrupted outside normal control flow. */
export interface InterruptedFailure extends FailureShape {
  readonly cause: unknown;
  readonly kind: "interrupted";
}
