import type { ContextKey, ECHO_TOKEN, SigilShape } from "#/contracts";
import type { Option } from "#/utils/index";

/**
 * Encodes context lookup as a sigil.
 *
 * @returns `lookup` sigil.
 */
export function lookup<Value>(key: ContextKey<Value>): LookupSigil<Value> {
  return {
    key,
    kind: "lookup",
  };
}

/** Context-lookup sigil. */
export interface LookupSigil<Value> extends SigilShape {
  readonly kind: "lookup";
  readonly key: ContextKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Option<Value>];
}
