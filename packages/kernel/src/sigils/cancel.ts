import type { ECHO_TOKEN, SigilShape } from "#/contracts";

/**
 * Models current-scope cancellation.
 *
 * @returns Cancel instruction.
 */
export function cancel(): CancelSigil {
  return { kind: "cancel" };
}

/** Sigil shape for cancellation. */
export interface CancelSigil extends SigilShape {
  readonly kind: "cancel";
  readonly [ECHO_TOKEN]?: readonly [never];
}
