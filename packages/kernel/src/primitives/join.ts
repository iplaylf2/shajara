import type { KhoraFailure, Plan } from "#src/contracts";
import type { Either } from "fp-ts/Either";
import type { SpawnRef as SpawnScopeRef } from "#src/syscalls";
import { notImplemented } from "#src/internal/not-implemented";

export function join<Return>(_spawned: SpawnScopeRef<Return>): Plan<Either<KhoraFailure, Return>> {
  return notImplemented("kernel primitive 'join'");
}
