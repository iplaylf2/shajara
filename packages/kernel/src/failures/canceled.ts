import type { FailureShape } from "#/contracts";

/**
 * Cancellation convergence value.
 *
 * @returns Canceled failure.
 */
export function canceledFailure(): CanceledFailure {
  return {
    kind: "canceled",
    message: "Canceled before completion",
  };
}

/** Failure emitted when work converges through cancellation. */
export interface CanceledFailure extends FailureShape {
  readonly kind: "canceled";
}
