import type { FailureShape } from "#/contracts";

export function canceledFailure(): CanceledFailure {
  return {
    kind: "canceled",
    message: "Canceled before completion",
  };
}

export interface CanceledFailure extends FailureShape {
  readonly kind: "canceled";
}
