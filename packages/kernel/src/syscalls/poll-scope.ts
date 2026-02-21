import type { ScopeRef } from "#src/scope";
import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export type ScopeStatus = "Running" | "Terminating" | "Exited" | "InLimbo";

export interface PollScopeResult {
  readonly status: ScopeStatus;
}

export interface PollScopeSyscall<
  Scope extends ScopeRef = ScopeRef,
> extends Syscall<PollScopeResult> {
  readonly kind: "poll-scope";
  readonly scope: Scope;
}

export function pollScope<Scope extends ScopeRef = ScopeRef>(
  _scope: Scope,
): PollScopeSyscall<Scope> {
  return notImplemented("kernel syscall 'poll-scope'");
}
