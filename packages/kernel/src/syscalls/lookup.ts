import type { ContextKey, Syscall } from "#src/contracts";
import type { Option, RETURN_TOKEN } from "#src/utils";

export function lookup<Value>(key: ContextKey<Value>): LookupSyscall<Value> {
  return {
    key,
    kind: "lookup",
  };
}

export interface LookupSyscall<Value> extends Syscall {
  readonly kind: "lookup";
  readonly key: ContextKey<Value>;
  readonly [RETURN_TOKEN]?: readonly [Option<Value>];
}
