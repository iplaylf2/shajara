import type { Plan, ScopeRef } from "#src/contracts";
import type { SelfDescriptor } from "#src/syscalls";
import type { StandardScopeRef } from "#src/scopes";
import { notImplemented } from "#src/internal/not-implemented";

export function self<Scope extends ScopeRef<unknown> = StandardScopeRef<unknown>>(): Plan<
  SelfDescriptor<Scope>
> {
  return notImplemented("kernel primitive 'self'");
}
