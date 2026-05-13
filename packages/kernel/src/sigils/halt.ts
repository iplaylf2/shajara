import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { Failure } from "#/failures";

/**
 * Creates a sigil that converges the current process with failure.
 *
 * @returns Halt sigil that does not resume the current process.
 */
export function halt(failure: Failure): HaltSigil {
  return { failure, kind: "halt" };
}

/** Sigil that converges the current process with failure. */
export interface HaltSigil extends SigilShape {
  readonly failure: Failure;
  readonly kind: "halt";
  readonly [ECHO_TOKEN]?: readonly [never];
}
