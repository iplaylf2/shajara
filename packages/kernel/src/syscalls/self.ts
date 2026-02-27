import type { ProcessRef, ScopeRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";
import type { StandardScopeRef } from "#src/scopes";

export interface SelfDescriptor<Scope extends ScopeRef<unknown> = StandardScopeRef<unknown>> {
  readonly scopeRef: Scope;
  readonly processRef: ProcessRef<unknown>;
}

export interface SelfSyscall<
  Scope extends ScopeRef<unknown> = StandardScopeRef<unknown>,
> extends Syscall {
  readonly kind: "self";
  readonly [RETURN_TOKEN]?: readonly [SelfDescriptor<Scope>];
}

export function self<
  Scope extends ScopeRef<unknown> = StandardScopeRef<unknown>,
>(): SelfSyscall<Scope> {
  return {
    kind: "self",
  };
}
