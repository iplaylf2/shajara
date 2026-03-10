import type { Failure, ScopeRef, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { awaitFuture } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function join<Relic>(scope: ScopeRef<Relic>): Wisp<Either<Failure, Relic>> {
  return wisp.liftF(awaitFuture(scope.exitFuture));
}
