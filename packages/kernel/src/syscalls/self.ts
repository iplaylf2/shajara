import type { ProcessRef } from "#src/contracts/process";
import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface SelfDescriptor {
  readonly scopeId: ScopeRef;
  readonly processId: ProcessRef;
}

export interface SelfSyscall extends Syscall<SelfDescriptor> {
  readonly kind: "self";
}

export function self(): SelfSyscall {
  return notImplemented("kernel syscall 'self'");
}
