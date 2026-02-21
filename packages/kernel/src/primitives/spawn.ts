import type { Plan } from "#src/contracts/plan";
import type { SpawnRef as SpawnScopeRef } from "#src/syscalls";
import { notImplemented } from "#src/internal/not-implemented";

export function spawn<ReturnValue, SpawnRef = SpawnScopeRef<ReturnValue>>(
  _plan: Plan<ReturnValue>,
): Plan<SpawnRef> {
  return notImplemented("kernel primitive 'spawn'");
}
