import type { FutureKey, FutureResult, Wisp } from "#/contracts";
import type { Option } from "#/utils/index";
import { poll as pollSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Observes a future's current settlement state without blocking.
 *
 * @returns Settled result, or `none` while pending.
 */
export function poll<Result>(future: FutureKey<Result>): Wisp<Option<FutureResult<Result>>> {
  return wisp.liftF(pollSigil(future));
}
