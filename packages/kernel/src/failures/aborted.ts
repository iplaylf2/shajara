import type { FailureShape } from "#src/contracts";

export function aborted(): AbortedFailure {
  return {
    kind: "aborted",
    message(): string {
      return "Aborted";
    },
  };
}

export interface AbortedFailure extends FailureShape {
  readonly kind: "aborted";
}
