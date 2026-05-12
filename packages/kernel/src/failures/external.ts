import type { FailureShape } from "#/contracts";

/**
 * Failure value for causes outside the kernel.
 *
 * @param raw - Original outside value.
 * @param message - Failure message.
 * @returns External failure.
 */
export function externalFailure(raw: unknown, message: string): ExternalFailure {
  return {
    kind: "external",
    message,
    raw,
  };
}

/** Failure mapped from a value that originated outside the kernel. */
export interface ExternalFailure extends FailureShape {
  readonly kind: "external";
  readonly raw: unknown;
}
