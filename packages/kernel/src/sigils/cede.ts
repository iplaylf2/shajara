import type { ECHO_TOKEN, SigilShape } from "#/contracts";

/**
 * Models cooperative yield.
 *
 * @returns Cede instruction.
 */
export function cede(): CedeSigil {
  return {
    kind: "cede",
  };
}

/** Sigil shape for cooperative yielding. */
export interface CedeSigil extends SigilShape {
  readonly kind: "cede";
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
