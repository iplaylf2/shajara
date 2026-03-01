import type { ProcessRef, ScopeRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function self<Scope extends ScopeRef<unknown>>(): SelfSyscall<Scope> {
  return {
    kind: "self",
  };
}

export interface SelfSyscall<Scope extends ScopeRef<unknown>> extends Syscall {
  readonly kind: "self";
  readonly [RETURN_TOKEN]?: readonly [SelfDescriptor<Scope>];
}

export interface SelfDescriptor<Scope extends ScopeRef<unknown>> {
  readonly scopeRef: Scope;
  readonly processRef: ProcessRef<unknown>;
}
