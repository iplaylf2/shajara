import type { Syscall } from "#src/contracts/syscall";

export interface BindSyscall<Key extends string = string, Value = unknown> extends Syscall {
  readonly kind: "bind";
  readonly key: Key;
  readonly return?: readonly [void];
  readonly value: Value;
}

export function bind<Key extends string = string, Value = unknown>(
  key: Key,
  value: Value,
): BindSyscall<Key, Value> {
  return {
    key,
    kind: "bind",
    value,
  };
}
