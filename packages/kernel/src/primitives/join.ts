import type { Plan } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export function join<ReturnValue, SpawnRef = unknown>(_spawned: SpawnRef): Plan<ReturnValue> {
  return notImplemented("kernel primitive 'join'");
}
