import type { ContextKey, ECHO_TOKEN, SigilShape } from "#/contracts";

/**
 * Models context unbinding.
 *
 * @param key - Binding identity.
 * @returns Unbind instruction.
 */
export function unbind(key: ContextKey<unknown>): UnbindSigil {
  return {
    key,
    kind: "unbind",
  };
}

/** Sigil shape for context unbinding. */
export interface UnbindSigil extends SigilShape {
  readonly kind: "unbind";
  readonly key: ContextKey<unknown>;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
