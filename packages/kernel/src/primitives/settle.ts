import type { Failure, FutureSettleKey, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { settle as settleSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function settle<Result extends Either<Failure, unknown>>(
  futureSettle: FutureSettleKey<Result>,
  result: Result,
): Wisp<void> {
  return wisp.liftF(settleSigil(futureSettle, result));
}
