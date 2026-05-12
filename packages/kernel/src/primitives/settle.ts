import type { FutureResult, FutureSettleKey, Wisp } from "#/contracts";
import { settle as settleSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Writes an in-band future result.
 *
 * @param futureSettle - Settlement authority.
 * @param result - In-band settlement.
 * @returns Completion after the settlement request.
 */
export function settle<Result>(
  futureSettle: FutureSettleKey<Result>,
  result: FutureResult<Result>,
): Wisp<void> {
  return wisp.liftF(settleSigil(futureSettle, result));
}
