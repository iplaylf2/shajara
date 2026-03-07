import type { ContextKey, Sigil } from "#src/contracts";
import type { Option, RETURN_TOKEN } from "#src/utils";

export function lookup<Value>(key: ContextKey<Value>): LookupSyscall<Value> {
  return {
    key,
    kind: "lookup",
  };
}

export interface LookupSyscall<Value> extends Sigil {
  readonly kind: "lookup";
  readonly key: ContextKey<Value>;
  readonly [RETURN_TOKEN]?: readonly [Option<Value>];
}
