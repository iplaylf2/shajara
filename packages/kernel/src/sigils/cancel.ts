import type { ECHO_TOKEN, SigilShape } from "#/contracts/index.js";

/**
 * Creates a sigil that moves the current scope onto the cancellation path.
 *
 * @returns Cancel sigil that does not resume the current process.
 */
export function cancel(): CancelSigil {
  return { kind: "cancel" };
}

/** Sigil that moves the current scope onto the cancellation path. */
export interface CancelSigil extends SigilShape {
  readonly kind: "cancel";
  readonly [ECHO_TOKEN]?: readonly [never];
}
