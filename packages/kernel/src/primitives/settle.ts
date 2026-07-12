import type { FutureResult, FutureSettleKey, Wisp } from "#/contracts/index.js";
import { settle as settleSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/** Requests in-band settlement for a future through its settlement authority. */
export function settle<Result>(
  futureSettle: FutureSettleKey<Result>,
  result: FutureResult<Result>,
): Wisp<void> {
  return wisp.liftF(settleSigil(futureSettle, result));
}
