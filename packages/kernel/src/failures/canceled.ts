import type { FailureShape } from "#/contracts";

/**
 * Returns the in-band failure value for cancellation convergence.
 *
 * @returns Canceled failure value.
 */
export function canceledFailure(): CanceledFailure {
  return {
    kind: "canceled",
    message: "Canceled before completion",
  };
}

/** Failure value reported when a process, scope, or future converges through cancellation. */
export interface CanceledFailure extends FailureShape {
  readonly kind: "canceled";
}
