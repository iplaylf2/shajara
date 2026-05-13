import type { ECHO_TOKEN, Ritual, SigilShape } from "#/contracts";

/**
 * Encodes process-cleanup registration as a sigil.
 *
 * @returns `defer` sigil.
 */
export function defer(cleanup: Ritual<void>): DeferSigil {
  return { cleanup, kind: "defer" };
}

/** Deferred process-cleanup sigil. */
export interface DeferSigil extends SigilShape {
  readonly cleanup: Ritual<void>;
  readonly kind: "defer";
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
