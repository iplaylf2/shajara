import type { Failure, Plan, ScopeRef } from "#src/contracts";
import type { Either } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export function join<Return>(_spawned: ScopeRef<Return>): Plan<Either<Failure, Return>> {
  return notImplemented("kernel primitive 'join'");
}
