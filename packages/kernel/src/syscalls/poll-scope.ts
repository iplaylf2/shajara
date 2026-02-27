import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";

export type ScopeStatus = "Running" | "Closing" | "Exited" | "InLimbo";

export interface PollScopeResult {
  readonly status: ScopeStatus;
}

export interface PollScopeSyscall<Scope extends ScopeRef<unknown>> extends Syscall {
  readonly kind: "poll-scope";
  readonly scope: Scope;
  readonly return?: readonly [PollScopeResult];
}

export function pollScope<Scope extends ScopeRef<unknown>>(scope: Scope): PollScopeSyscall<Scope> {
  return {
    kind: "poll-scope",
    scope,
  };
}
