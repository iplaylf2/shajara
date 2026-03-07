import type { Failure, ScopeRef, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { awaitScopeConverged } from "#src/primitives-kit";

export function join<Relic>(scope: ScopeRef<Relic>): Wisp<Either<Failure, Relic>> {
  return awaitScopeConverged(scope);
}
