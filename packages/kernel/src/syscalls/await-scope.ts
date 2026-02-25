import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";

export type AwaitScopeExit = { readonly kind: "exited" } | { readonly kind: "pruned_to_limbo" };

export interface AwaitScopeSyscall<Scope extends ScopeRef = ScopeRef> extends Syscall {
  readonly kind: "await-scope";
  readonly scope: Scope;
  readonly return?: readonly [AwaitScopeExit];
}

export function awaitScope<Scope extends ScopeRef = ScopeRef>(
  scope: Scope,
): AwaitScopeSyscall<Scope> {
  return {
    kind: "await-scope",
    scope,
  };
}
