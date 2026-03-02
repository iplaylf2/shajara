import type { ContextKey, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function bind<Value>(key: ContextKey<Value>, value: Value): BindSyscall<Value> {
  return {
    key,
    kind: "bind",
    value,
  };
}

export interface BindSyscall<Value> extends Syscall {
  readonly kind: "bind";
  readonly key: ContextKey<Value>;
  readonly [RETURN_TOKEN]?: readonly [void];
  readonly value: Value;
}
