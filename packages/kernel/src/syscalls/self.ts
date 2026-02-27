import type { ProcessRef } from "#src/contracts/process";
import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";

export interface SelfDescriptor {
  readonly scopeRef: ScopeRef<unknown>;
  readonly processRef: ProcessRef<unknown>;
}

export interface SelfSyscall extends Syscall {
  readonly kind: "self";
  readonly return?: readonly [SelfDescriptor];
}

export function self(): SelfSyscall {
  return {
    kind: "self",
  };
}
