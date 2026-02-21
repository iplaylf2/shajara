import type { ScopeRef } from "#src/executor";
import type { Syscall } from "#src/syscalls-kit/syscall";

export interface SelfDescriptor {
  readonly scope: ScopeRef;
  readonly call: { readonly method: string; readonly args: readonly unknown[] } | undefined;
}

export interface SelfSyscall extends Syscall<SelfDescriptor> {
  readonly kind: "self";
}

export function self(): SelfSyscall {
  return { kind: "self" };
}
