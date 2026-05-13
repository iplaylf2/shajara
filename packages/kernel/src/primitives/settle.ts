import type { FutureResult, FutureSettleKey, Wisp } from "#/contracts";
import { settle as settleSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/** Requests in-band settlement for a future through its settlement authority. */
export function settle<Result>(
  futureSettle: FutureSettleKey<Result>,
  result: FutureResult<Result>,
): Wisp<void> {
  return wisp.liftF(settleSigil(futureSettle, result));
}
