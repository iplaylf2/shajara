import type { ScopeExit, ScopeRef, ScopeRefReturn, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function awaitScope<Scope extends ScopeRef<unknown>>(
  scope: Scope,
): AwaitScopeSyscall<Scope> {
  return {
    kind: "await-scope",
    scope,
  };
}

export interface AwaitScopeSyscall<Scope extends ScopeRef<unknown>> extends Syscall {
  readonly kind: "await-scope";
  readonly scope: Scope;
  readonly [RETURN_TOKEN]?: readonly [ScopeExit<ScopeRefReturn<Scope>>];
}
