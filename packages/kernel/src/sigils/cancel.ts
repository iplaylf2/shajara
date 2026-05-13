import type { ECHO_TOKEN, SigilShape } from "#/contracts";

/**
 * Encodes current-scope cancellation as a sigil.
 *
 * @returns `cancel` sigil.
 */
export function cancel(): CancelSigil {
  return { kind: "cancel" };
}

/** Current-scope cancellation sigil. */
export interface CancelSigil extends SigilShape {
  readonly kind: "cancel";
  readonly [ECHO_TOKEN]?: readonly [never];
}
