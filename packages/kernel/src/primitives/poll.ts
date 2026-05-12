import type { FutureKey, FutureResult, Wisp } from "#/contracts";
import type { Option } from "#/utils/index";
import { poll as pollSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Observes settled future state without blocking.
 *
 * @param future - Future to inspect.
 * @returns Settled result, or none.
 */
export function poll<Result>(future: FutureKey<Result>): Wisp<Option<FutureResult<Result>>> {
  return wisp.liftF(pollSigil(future));
}
