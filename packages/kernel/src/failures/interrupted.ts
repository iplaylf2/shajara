import type { FailureShape } from "#/contracts";

/**
 * Creates a failure value for interrupted kernel execution.
 *
 * @returns Interrupted failure value.
 */
export function interruptedFailure(cause: unknown): InterruptedFailure {
  return {
    cause,
    kind: "interrupted",
    message: "Scope progression was interrupted by an out-of-band failure",
  };
}

/** Failure value for kernel execution interrupted outside normal control flow. */
export interface InterruptedFailure extends FailureShape {
  /** Out-of-band cause that interrupted kernel execution. */
  readonly cause: unknown;
  readonly kind: "interrupted";
}
