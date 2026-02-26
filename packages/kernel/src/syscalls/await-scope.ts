import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";

type ScopeReturn<Scope extends ScopeRef> = Scope extends ScopeRef<infer Return> ? Return : never;

export type AwaitScopeExit<Return = unknown> =
  | { readonly kind: "completed"; readonly value: Return }
  | { readonly kind: "failed"; readonly fault: unknown }
  | { readonly kind: "terminated" };

export interface AwaitScopeSyscall<Scope extends ScopeRef = ScopeRef> extends Syscall {
  readonly kind: "await-scope";
  readonly scope: Scope;
  readonly return?: readonly [AwaitScopeExit<ScopeReturn<Scope>>];
}

export function awaitScope<Scope extends ScopeRef>(scope: Scope): AwaitScopeSyscall<Scope> {
  return {
    kind: "await-scope",
    scope,
  };
}
