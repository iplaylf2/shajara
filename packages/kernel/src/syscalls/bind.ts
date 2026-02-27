import type { Syscall } from "#src/contracts";

export interface BindSyscall<Key extends string, Value> extends Syscall {
  readonly kind: "bind";
  readonly key: Key;
  readonly return?: readonly [void];
  readonly value: Value;
}

export function bind<Key extends string, Value>(key: Key, value: Value): BindSyscall<Key, Value> {
  return {
    key,
    kind: "bind",
    value,
  };
}
