import type { FailureShape } from "#/contracts";

export function externalFailure(raw: unknown, message: string): ExternalFailure {
  return {
    kind: "external",
    message,
    raw,
  };
}

export interface ExternalFailure extends FailureShape {
  readonly kind: "external";
  readonly raw: unknown;
}
