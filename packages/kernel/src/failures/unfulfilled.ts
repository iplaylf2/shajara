import type { FailureShape } from "#/contracts";

/**
 * Creates the failure value for a future whose owner scope closed before the future
 * produced a result.
 */
export function unfulfilledFailure(): UnfulfilledFailure {
  return {
    kind: "unfulfilled",
    message: "Future was not fulfilled before its owner scope closed",
  };
}

/** Failure value for a future whose owner scope closed before the future produced a result. */
export interface UnfulfilledFailure extends FailureShape {
  readonly kind: "unfulfilled";
}
