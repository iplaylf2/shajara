import type { Plan } from "#src/contracts/plan";
import type { SpawnRef as SpawnScopeRef } from "#src/syscalls";
import { notImplemented } from "#src/internal/not-implemented";

export function join<ReturnValue, SpawnRef = SpawnScopeRef<ReturnValue>>(
  _spawned: SpawnRef,
): Plan<ReturnValue> {
  return notImplemented("kernel primitive 'join'");
}
