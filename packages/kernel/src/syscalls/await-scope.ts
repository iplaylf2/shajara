import type { ScopeExit, ScopeRef, ScopeRefReturn } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";

export interface AwaitScopeSyscall<Scope extends ScopeRef<unknown>> extends Syscall {
  readonly kind: "await-scope";
  readonly scope: Scope;
  readonly return?: readonly [ScopeExit<ScopeRefReturn<Scope>>];
}

export function awaitScope<Scope extends ScopeRef<unknown>>(
  scope: Scope,
): AwaitScopeSyscall<Scope> {
  return {
    kind: "await-scope",
    scope,
  };
}
