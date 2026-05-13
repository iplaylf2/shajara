import type { ECHO_TOKEN, SigilShape } from "#/contracts";

/**
 * Encodes cooperative yielding as a sigil.
 *
 * @returns `cede` sigil.
 */
export function cede(): CedeSigil {
  return {
    kind: "cede",
  };
}

/** Cooperative-yield sigil. */
export interface CedeSigil extends SigilShape {
  readonly kind: "cede";
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
