import type { ContextKey, ECHO_TOKEN, SigilShape } from "#/contracts/index.js";

/**
 * Creates a sigil that adds or shadows a context binding on the current scope.
 *
 * @returns Bind sigil that completes after the binding is installed.
 */
export function bind<Value>(key: ContextKey<Value>, value: Value): BindSigil<Value> {
  return {
    key,
    kind: "bind",
    value,
  };
}

/** Sigil that adds or shadows a context binding on the current scope. */
export interface BindSigil<Value> extends SigilShape {
  readonly kind: "bind";
  readonly key: ContextKey<Value>;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
  readonly value: Value;
}
