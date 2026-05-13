import type { FutureKey, FutureResult, Wisp } from "#/contracts";
import { wait as waitSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Waits for a future to settle.
 *
 * @returns In-band settlement result.
 */
export function wait<Result>(future: FutureKey<Result>): Wisp<FutureResult<Result>> {
  return wisp.liftF(waitSigil(future));
}
