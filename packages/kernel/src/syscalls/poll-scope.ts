import type { ScopeRef } from "#src/contracts/scope";
import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export type ScopeStatus = "Running" | "Terminating" | "Exited" | "InLimbo";

export interface PollScopeResult {
  readonly status: ScopeStatus;
}

export interface PollScopeSyscall<Scope extends ScopeRef = ScopeRef> extends Syscall {
  readonly kind: "poll-scope";
  readonly scope: Scope;
  readonly return: readonly [PollScopeResult];
}

export function pollScope<Scope extends ScopeRef = ScopeRef>(
  _scope: Scope,
): PollScopeSyscall<Scope> {
  return notImplemented("kernel syscall 'poll-scope'");
}
