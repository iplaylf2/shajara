import type { FutureKey, FutureResult, Wisp } from "#/contracts";
import { wait as waitSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function wait<Result>(future: FutureKey<Result>): Wisp<FutureResult<Result>> {
  return wisp.liftF(waitSigil(future));
}
