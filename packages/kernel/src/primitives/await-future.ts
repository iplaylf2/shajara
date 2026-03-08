import type { Failure, FutureKey, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { awaitFuture as awaitFutureSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function awaitFuture<Value extends Either<Failure, unknown>>(
  futureKey: FutureKey<Value>,
): Wisp<Value> {
  return wisp.liftF(awaitFutureSigil(futureKey));
}
