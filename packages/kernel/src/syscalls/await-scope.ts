import type { KhoraFailure } from "#src/contracts/failure";
import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";

type ScopeReturn<Scope extends ScopeRef<unknown>> =
  Scope extends ScopeRef<infer Return> ? Return : never;

export type AwaitScopeExit<Return> =
  | { readonly kind: "completed"; readonly value: Return }
  | { readonly kind: "failed"; readonly fault: KhoraFailure }
  | { readonly kind: "terminated" };

export interface AwaitScopeSyscall<Scope extends ScopeRef<unknown>> extends Syscall {
  readonly kind: "await-scope";
  readonly scope: Scope;
  readonly return?: readonly [AwaitScopeExit<ScopeReturn<Scope>>];
}

export function awaitScope<Scope extends ScopeRef<unknown>>(
  scope: Scope,
): AwaitScopeSyscall<Scope> {
  return {
    kind: "await-scope",
    scope,
  };
}
