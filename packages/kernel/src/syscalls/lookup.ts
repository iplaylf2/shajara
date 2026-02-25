import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface LookupSyscall<Value = unknown> extends Syscall {
  readonly kind: "lookup";
  readonly key: string;
  readonly return: readonly [Value];
}

export function lookup<Value = unknown>(_key: string): LookupSyscall<Value> {
  return notImplemented("kernel syscall 'lookup'");
}
