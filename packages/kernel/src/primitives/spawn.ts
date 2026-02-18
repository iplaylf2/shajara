import type { Plan } from "#src/plan-contract";
import { notImplemented } from "#src/internal/not-implemented";

export function spawn<ReturnValue, SpawnRef = unknown>(_plan: Plan<ReturnValue>): Plan<SpawnRef> {
  return notImplemented("kernel primitive 'spawn'");
}
