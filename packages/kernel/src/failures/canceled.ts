import type { FailureShape } from "#src/contracts";

export function canceled(): CanceledFailure {
  return {
    kind: "canceled",
    message(): string {
      return "Canceled before completion";
    },
  };
}

export interface CanceledFailure extends FailureShape {
  readonly kind: "canceled";
}
