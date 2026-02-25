import type { Syscall } from "#src/contracts/syscall";

export interface LookupSyscall<Value = unknown> extends Syscall {
  readonly kind: "lookup";
  readonly key: string;
  readonly return?: readonly [Value];
}

export function lookup<Value = unknown>(key: string): LookupSyscall<Value> {
  return {
    key,
    kind: "lookup",
  };
}
