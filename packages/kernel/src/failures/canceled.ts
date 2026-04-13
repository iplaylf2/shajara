import type { FailureShape } from "#/contracts";

export const canceledFailure: CanceledFailure = {
  kind: "canceled",
  message: "Canceled before completion",
};

export interface CanceledFailure extends FailureShape {
  readonly kind: "canceled";
}
