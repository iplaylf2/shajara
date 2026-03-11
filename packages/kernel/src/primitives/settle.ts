import type { FutureResult, FutureSettleKey, Wisp } from "#src/contracts";
import { settle as settleSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function settle<Result>(
  futureSettle: FutureSettleKey<Result>,
  result: FutureResult<Result>,
): Wisp<void> {
  return wisp.liftF(settleSigil(futureSettle, result));
}
