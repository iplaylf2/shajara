import type { Plan, ScopeSpec } from "#src/contracts";
import type { SpawnRef as SpawnScopeRef } from "#src/syscalls";
import { notImplemented } from "#src/internal/not-implemented";

export function spawn<Return>(_plan: Plan<Return>, _spec?: ScopeSpec): Plan<SpawnScopeRef<Return>> {
  return notImplemented("kernel primitive 'spawn'");
}
