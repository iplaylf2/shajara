import type { ECHO_TOKEN, Ritual, SigilShape } from "#/contracts";

/**
 * Creates a sigil that registers cleanup for the current process exit path.
 *
 * @returns Defer sigil that completes after cleanup registration.
 */
export function defer(cleanup: Ritual<void>): DeferSigil {
  return { cleanup, kind: "defer" };
}

/** Sigil that registers cleanup for the current process exit path. */
export interface DeferSigil extends SigilShape {
  readonly cleanup: Ritual<void>;
  readonly kind: "defer";
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
