import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface BindSyscall<Key extends string = string, Value = unknown> extends Syscall<void> {
  readonly kind: "bind";
  readonly key: Key;
  readonly value: Value;
}

export function bind<Key extends string = string, Value = unknown>(
  _key: Key,
  _value: Value,
): BindSyscall<Key, Value> {
  return notImplemented("kernel syscall 'bind'");
}
