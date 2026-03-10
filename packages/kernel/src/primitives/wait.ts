import type { Failure, FutureKey, Wisp } from "#src/contracts";
import type { Either } from "#src/utils";
import { wait as waitSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function wait<Result extends Either<Failure, unknown>>(
  future: FutureKey<Result>,
): Wisp<Result> {
  return wisp.liftF(waitSigil(future));
}
