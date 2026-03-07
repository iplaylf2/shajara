import type { Failure, ScopeRef, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { awaitScopeConverged } from "#src/primitives-kit";

export function join<Return>(scope: ScopeRef<Return>): Wisp<Either<Failure, Return>> {
  return awaitScopeConverged(scope);
}
