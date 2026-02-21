import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface LookupSyscall<Value = unknown> extends Syscall<Value> {
  readonly kind: "lookup";
  readonly key: string;
}

export function lookup<Value = unknown>(_key: string): LookupSyscall<Value> {
  return notImplemented("kernel syscall 'lookup'");
}
