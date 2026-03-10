import type { Failure, ScopeRef, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { awaitFuture } from "#src/primitives/await-future";

export function join<Relic>(scope: ScopeRef<Relic>): Wisp<Either<Failure, Relic>> {
  return awaitFuture(scope.exitFuture);
}
