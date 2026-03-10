import type { Failure, FutureKey, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { wait as waitSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function wait<Value extends Either<Failure, unknown>>(
  futureKey: FutureKey<Value>,
): Wisp<Value> {
  return wisp.liftF(waitSigil(futureKey));
}
