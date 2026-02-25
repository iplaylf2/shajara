import type { Either } from "fp-ts/Either";
import type { Plan } from "#src/contracts/plan";
import type { SpawnRef as SpawnScopeRef } from "#src/syscalls";
import { notImplemented } from "#src/internal/not-implemented";

export function join<ReturnValue>(
  _spawned: SpawnScopeRef<ReturnValue>,
): Plan<Either<unknown, ReturnValue>> {
  return notImplemented("kernel primitive 'join'");
}
