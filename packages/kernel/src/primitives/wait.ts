import type { FutureKey, FutureResult, Wisp } from "#src/contracts";
import { wait as waitSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function wait<Result>(future: FutureKey<Result>): Wisp<FutureResult<Result>> {
  return wisp.liftF(waitSigil(future));
}
