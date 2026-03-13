import type { ContextKey, ECHO_TOKEN, SigilShape } from "#src/contracts";
import type { Option } from "#src/utils";

export function lookup<Value>(key: ContextKey<Value>): LookupSigil<Value> {
  return {
    key,
    kind: "lookup",
  };
}

export interface LookupSigil<Value> extends SigilShape {
  readonly kind: "lookup";
  readonly key: ContextKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Option<Value>];
}
