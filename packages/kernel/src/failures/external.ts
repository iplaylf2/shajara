import type { Failure } from "#src/contracts";

export function externalFailure(raw: unknown, message: () => string): ExternalFailure {
  return {
    kind: "external",
    message,
    raw,
  };
}

export interface ExternalFailure extends Failure {
  readonly kind: "external";
  readonly raw: unknown;
}
