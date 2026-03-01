import type { Failure, Plan, ScopeRef } from "#src/contracts";
import type { Either } from "#src/utils";
import { awaitScopeConverged } from "#src/primitives-kit";

export function join<Return>(scope: ScopeRef<Return>): Plan<Either<Failure, Return>> {
  return awaitScopeConverged(scope);
}
