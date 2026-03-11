import type { FutureKey, FutureSettleKey, Wisp } from "#src/contracts";
import { future as futureSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function future<Result>(): Wisp<[FutureKey<Result>, FutureSettleKey<Result>]> {
  return wisp.liftF(futureSigil<Result>());
}
