import type { FutureHandle, Wisp } from "#/contracts";
import { future as futureSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export function future<Result>(): Wisp<FutureHandle<Result>> {
  return wisp.liftF(futureSigil<Result>());
}
