import type { Syscall } from "#src/contracts";

export interface LookupSyscall<Value> extends Syscall {
  readonly kind: "lookup";
  readonly key: string;
  readonly return?: readonly [Value];
}

export function lookup<Value>(key: string): LookupSyscall<Value> {
  return {
    key,
    kind: "lookup",
  };
}
