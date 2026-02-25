import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";

export type AwaitScopeExit<ReturnValue = unknown> =
  | { readonly kind: "completed"; readonly value: ReturnValue }
  | { readonly kind: "failed"; readonly fault: unknown }
  | { readonly kind: "terminated" };

export interface AwaitScopeSyscall<
  ReturnValue = unknown,
  Scope extends ScopeRef<ReturnValue> = ScopeRef<ReturnValue>,
> extends Syscall {
  readonly kind: "await-scope";
  readonly scope: Scope;
  readonly return?: readonly [AwaitScopeExit<ReturnValue>];
}

export function awaitScope<
  ReturnValue = unknown,
  Scope extends ScopeRef<ReturnValue> = ScopeRef<ReturnValue>,
>(scope: Scope): AwaitScopeSyscall<ReturnValue, Scope> {
  return {
    kind: "await-scope",
    scope,
  };
}
