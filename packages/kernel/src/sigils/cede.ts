import type { ECHO_TOKEN, SigilShape } from "#/contracts/index.js";

/**
 * Creates a sigil that cedes the current turn before continuing.
 *
 * @returns Cede sigil that resumes after the cooperative yield.
 */
export function cede(): CedeSigil {
  return {
    kind: "cede",
  };
}

/** Sigil that cedes the current turn before continuing. */
export interface CedeSigil extends SigilShape {
  readonly kind: "cede";
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
