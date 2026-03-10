import type { Failure, FutureKey, FutureSettleKey, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { future as futureSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function future<Value extends Either<Failure, unknown>>(): Wisp<
  [FutureKey<Value>, FutureSettleKey<Value>]
> {
  return wisp.liftF(futureSigil<Value>());
}
