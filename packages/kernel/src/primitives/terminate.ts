import type { Plan } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export function terminate<SpawnRef = unknown>(_spawned: SpawnRef): Plan<void> {
  return notImplemented("kernel primitive 'terminate'");
}
