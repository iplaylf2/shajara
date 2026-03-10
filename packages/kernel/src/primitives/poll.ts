import type { Either, Option } from "#src/utils";
import type { Failure, FutureKey, Wisp } from "#src/contracts";
import { poll as pollSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function poll<Result extends Either<Failure, unknown>>(
  future: FutureKey<Result>,
): Wisp<Option<Result>> {
  return wisp.liftF(pollSigil(future));
}
