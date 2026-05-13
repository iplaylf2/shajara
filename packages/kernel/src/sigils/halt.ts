import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { Failure } from "#/failures";

/**
 * Encodes in-band process failure as a sigil.
 *
 * @returns `halt` sigil.
 */
export function halt(failure: Failure): HaltSigil {
  return { failure, kind: "halt" };
}

/** In-band process failure sigil. */
export interface HaltSigil extends SigilShape {
  readonly failure: Failure;
  readonly kind: "halt";
  readonly [ECHO_TOKEN]?: readonly [never];
}
