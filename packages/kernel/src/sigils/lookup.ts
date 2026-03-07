import type { ContextKey, ECHO_TOKEN, Sigil } from "#src/contracts";
import type { Option } from "#src/utils";

export function lookup<Value>(key: ContextKey<Value>): LookupSigil<Value> {
  return {
    key,
    kind: "lookup",
  };
}

export interface LookupSigil<Value> extends Sigil {
  readonly kind: "lookup";
  readonly key: ContextKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Option<Value>];
}
