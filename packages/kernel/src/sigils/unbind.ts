import type { ContextKey, ECHO_TOKEN, SigilShape } from "#/contracts";

/**
 * Encodes context unbinding as a sigil.
 *
 * @returns `unbind` sigil.
 */
export function unbind(key: ContextKey<unknown>): UnbindSigil {
  return {
    key,
    kind: "unbind",
  };
}

/** Context-unbinding sigil. */
export interface UnbindSigil extends SigilShape {
  readonly kind: "unbind";
  readonly key: ContextKey<unknown>;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
