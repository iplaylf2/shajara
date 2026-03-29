import type { FailureShape } from "#/contracts";

export const canceledFailure: CanceledFailure = {
  kind: "canceled",
  get message(): string {
    return "Canceled before completion";
  },
};

export interface CanceledFailure extends FailureShape {
  readonly kind: "canceled";
}
