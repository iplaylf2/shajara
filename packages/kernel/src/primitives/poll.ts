import type { FutureKey, FutureResult, Wisp } from "#/contracts/index.js";
import type { Option } from "#/utils/index.js";
import { poll as pollSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Observes a future's current settlement state without blocking the current process.
 *
 * @returns Settled result, or `none` while pending.
 */
export function poll<Result>(future: FutureKey<Result>): Wisp<Option<FutureResult<Result>>> {
  return wisp.liftF(pollSigil(future));
}
