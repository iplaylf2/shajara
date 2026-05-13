import type { FailureShape } from "#/contracts";

/**
 * Maps a cause that originated outside the kernel into a failure value.
 *
 * @returns External failure value.
 */
export function externalFailure(raw: unknown, message: string): ExternalFailure {
  return {
    kind: "external",
    message,
    raw,
  };
}

/** Failure value mapped from a cause that originated outside the kernel. */
export interface ExternalFailure extends FailureShape {
  readonly kind: "external";
  /** Unmapped value that originated outside the kernel. */
  readonly raw: unknown;
}
