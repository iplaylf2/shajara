import type { ContextKey, ECHO_TOKEN, SigilShape } from "#/contracts/index.js";

/**
 * Creates a sigil that removes the current scope's binding for a context key.
 *
 * @returns Unbind sigil that completes after the local binding is removed.
 */
export function unbind(key: ContextKey<unknown>): UnbindSigil {
  return {
    key,
    kind: "unbind",
  };
}

/** Sigil that removes the current scope's binding for a context key. */
export interface UnbindSigil extends SigilShape {
  readonly kind: "unbind";
  readonly key: ContextKey<unknown>;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
