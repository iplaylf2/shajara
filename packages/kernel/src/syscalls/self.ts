import type { CallDescriptor } from "#src/syscalls-kit/capability";
import type { ProcessRef } from "#src/syscalls-kit/process";
import type { ScopeRef } from "#src/scope";
import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface SelfDescriptor {
  readonly scope: ScopeRef;
  readonly process: ProcessRef;
  readonly call: CallDescriptor | undefined;
}

export interface SelfSyscall extends Syscall<SelfDescriptor> {
  readonly kind: "self";
}

export function self(): SelfSyscall {
  return notImplemented("kernel syscall 'self'");
}
