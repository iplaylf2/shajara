import type { ECHO_TOKEN, Ritual, SigilShape } from "#/contracts";

/**
 * Models process cleanup registration.
 *
 * @param cleanup - Cleanup ritual.
 * @returns Defer instruction.
 */
export function defer(cleanup: Ritual<void>): DeferSigil {
  return { cleanup, kind: "defer" };
}

/** Sigil shape for deferred process cleanup. */
export interface DeferSigil extends SigilShape {
  readonly cleanup: Ritual<void>;
  readonly kind: "defer";
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
