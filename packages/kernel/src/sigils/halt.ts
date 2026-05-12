import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { Failure } from "#/failures";

/**
 * Models in-band process failure.
 *
 * @returns Halt instruction.
 */
export function halt(failure: Failure): HaltSigil {
  return { failure, kind: "halt" };
}

/** Sigil shape for in-band process failure. */
export interface HaltSigil extends SigilShape {
  readonly failure: Failure;
  readonly kind: "halt";
  readonly [ECHO_TOKEN]?: readonly [never];
}
