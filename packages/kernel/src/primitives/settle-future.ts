import type { Failure, FutureResolverKey, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { settleFuture as settleFutureSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function settleFuture<Value extends Either<Failure, unknown>>(
  futureResolverKey: FutureResolverKey<Value>,
  result: Value,
): Wisp<void> {
  return wisp.liftF(settleFutureSigil(futureResolverKey, result));
}
