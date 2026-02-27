import type { ProcessRef, ScopeRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export interface SelfDescriptor {
  readonly scopeRef: ScopeRef<unknown>;
  readonly processRef: ProcessRef<unknown>;
}

export interface SelfSyscall extends Syscall {
  readonly kind: "self";
  readonly [RETURN_TOKEN]?: readonly [SelfDescriptor];
}

export function self(): SelfSyscall {
  return {
    kind: "self",
  };
}
