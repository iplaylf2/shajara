import type { FutureKey, FutureResult, Wisp } from "#/contracts/index.js";
import { wait as waitSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Waits for a future to settle.
 *
 * @returns In-band settlement result.
 */
export function wait<Result>(future: FutureKey<Result>): Wisp<FutureResult<Result>> {
  return wisp.liftF(waitSigil(future));
}
