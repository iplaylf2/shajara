import type { Plan } from "#src/contracts/plan";
import type { ScopeSpec } from "#src/primitives-kit";
import type { SpawnRef as SpawnScopeRef } from "#src/syscalls";
import { notImplemented } from "#src/internal/not-implemented";

export function spawn<ReturnValue>(
  _plan: Plan<ReturnValue>,
  _spec?: ScopeSpec,
): Plan<SpawnScopeRef<ReturnValue>> {
  return notImplemented("kernel primitive 'spawn'");
}
