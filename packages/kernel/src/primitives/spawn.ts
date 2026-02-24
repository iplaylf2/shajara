import type { Plan } from "#src/contracts/plan";
import type { ScopeSpec } from "#src/primitives-kit";
import type { SpawnRef as SpawnScopeRef } from "#src/syscalls";
import { notImplemented } from "#src/internal/not-implemented";

export function spawn<ReturnValue, SpawnRef = SpawnScopeRef<ReturnValue>>(
  _plan: Plan<ReturnValue>,
  _spec?: ScopeSpec,
): Plan<SpawnRef> {
  return notImplemented("kernel primitive 'spawn'");
}
