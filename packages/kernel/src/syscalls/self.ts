import type { ProcessRef } from "#src/contracts/process";
import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface SelfDescriptor {
  readonly scopeRef: ScopeRef;
  readonly processRef: ProcessRef;
}

export interface SelfSyscall extends Syscall {
  readonly kind: "self";
  readonly return: readonly [SelfDescriptor];
}

export function self(): SelfSyscall {
  return notImplemented("kernel syscall 'self'");
}
