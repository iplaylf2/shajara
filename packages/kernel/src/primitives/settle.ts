import type { Failure, FutureSettleKey, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { settle as settleSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function settle<Value extends Either<Failure, unknown>>(
  futureSettleKey: FutureSettleKey<Value>,
  result: Value,
): Wisp<void> {
  return wisp.liftF(settleSigil(futureSettleKey, result));
}
