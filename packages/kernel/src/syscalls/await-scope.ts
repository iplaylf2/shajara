import type { ScopeRef } from "#src/scope";
import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export type AwaitScopeExit = { readonly kind: "exited" } | { readonly kind: "pruned_to_limbo" };

export interface AwaitScopeSyscall<
  Scope extends ScopeRef = ScopeRef,
> extends Syscall<AwaitScopeExit> {
  readonly kind: "await-scope";
  readonly scope: Scope;
}

export function awaitScope<Scope extends ScopeRef = ScopeRef>(
  _scope: Scope,
): AwaitScopeSyscall<Scope> {
  return notImplemented("kernel syscall 'await-scope'");
}
