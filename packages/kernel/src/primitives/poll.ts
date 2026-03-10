import type { Either, Option } from "#src/utils";
import type { Failure, FutureKey, Wisp } from "#src/contracts";
import { poll as pollSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function poll<Value extends Either<Failure, unknown>>(
  futureKey: FutureKey<Value>,
): Wisp<Option<Value>> {
  return wisp.liftF(pollSigil(futureKey));
}
