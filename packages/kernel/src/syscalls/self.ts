import type { ProcessRef, ScopeRef, Syscall } from "#src/contracts";

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
