import type { FailureShape } from "#/contracts";

/**
 * Returns an in-band failure for a value that originated outside the computation.
 *
 * @param raw - Original external value.
 * @param message - Caller-facing failure message.
 * @returns External failure value.
 */
export function externalFailure(raw: unknown, message: string): ExternalFailure {
  return {
    kind: "external",
    message,
    raw,
  };
}

/** Failure value mapped from a cause that originated outside the computation. */
export interface ExternalFailure extends FailureShape {
  readonly kind: "external";
  /** Unmapped value that originated outside the computation. */
  readonly raw: unknown;
}
