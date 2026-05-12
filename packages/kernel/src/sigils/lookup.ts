import type { ContextKey, ECHO_TOKEN, SigilShape } from "#/contracts";
import type { Option } from "#/utils/index";

/**
 * Models context lookup.
 *
 * @param key - Lookup identity.
 * @returns Lookup instruction.
 */
export function lookup<Value>(key: ContextKey<Value>): LookupSigil<Value> {
  return {
    key,
    kind: "lookup",
  };
}

/** Sigil shape for context lookup. */
export interface LookupSigil<Value> extends SigilShape {
  readonly kind: "lookup";
  readonly key: ContextKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Option<Value>];
}
