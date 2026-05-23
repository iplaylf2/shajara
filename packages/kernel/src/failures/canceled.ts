import type { FailureShape } from "#/contracts";

/**
 * Creates the failure value for cancellation convergence.
 */
export function canceledFailure(): CanceledFailure {
  return {
    kind: "canceled",
    message: "Canceled before completion",
  };
}

/** Failure value for cancellation convergence. */
export interface CanceledFailure extends FailureShape {
  readonly kind: "canceled";
}
