import type { FailureShape } from "#/contracts";

export function interruptedFailure(cause: unknown): InterruptedFailure {
  return {
    cause,
    kind: "interrupted",
    message: "Scope progression was interrupted by an out-of-band failure",
  };
}

export interface InterruptedFailure extends FailureShape {
  readonly cause: unknown;
  readonly kind: "interrupted";
}
