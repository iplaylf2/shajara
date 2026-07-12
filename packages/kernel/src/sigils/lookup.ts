import type { ContextKey, ECHO_TOKEN, SigilShape } from "#/contracts/index.js";
import type { Option } from "#/utils/index.js";

/**
 * Creates a sigil that resolves the nearest visible context binding.
 *
 * @returns Lookup sigil whose echo is the binding value or `none`.
 */
export function lookup<Value>(key: ContextKey<Value>): LookupSigil<Value> {
  return {
    key,
    kind: "lookup",
  };
}

/** Sigil that resolves the nearest visible context binding. */
export interface LookupSigil<Value> extends SigilShape {
  readonly kind: "lookup";
  readonly key: ContextKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Option<Value>];
}
