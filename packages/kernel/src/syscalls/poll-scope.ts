import type { ScopeRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export type ScopeStatus = "Running" | "Closing" | "Exited" | "InLimbo";

export interface PollScopeResult {
  readonly status: ScopeStatus;
}

export interface PollScopeSyscall<Scope extends ScopeRef<unknown>> extends Syscall {
  readonly kind: "poll-scope";
  readonly scope: Scope;
  readonly [RETURN_TOKEN]?: readonly [PollScopeResult];
}

export function pollScope<Scope extends ScopeRef<unknown>>(scope: Scope): PollScopeSyscall<Scope> {
  return {
    kind: "poll-scope",
    scope,
  };
}
