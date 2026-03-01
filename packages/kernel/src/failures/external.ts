import type { Failure } from "#src/contracts";

export function externalFailure(message: () => string): ExternalFailure {
  return {
    kind: "external",
    message,
  };
}

export interface ExternalFailure extends Failure {
  readonly kind: "external";
}
