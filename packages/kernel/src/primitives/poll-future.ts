import type { Either, Option } from "#src/utils";
import type { Failure, FutureKey, Wisp } from "#src/contracts";
import { pollFuture as pollFutureSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function pollFuture<Value extends Either<Failure, unknown>>(
  futureKey: FutureKey<Value>,
): Wisp<Option<Value>> {
  return wisp.liftF(pollFutureSigil(futureKey));
}
