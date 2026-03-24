import type { FutureKey, FutureSettleKey, Wisp } from "#/contracts";
import { future as futureSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export function future<Result>(): Wisp<[FutureKey<Result>, FutureSettleKey<Result>]> {
  return wisp.liftF(futureSigil<Result>());
}
