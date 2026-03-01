import type { Either } from "@khora/kernel/utils";
import type { Failure } from "@khora/kernel";
import { KhoraError } from "#src/errors";
import { matchEither } from "@khora/kernel/utils";

export function unwrapEither<Return>(either: Either<Failure, Return>): Return {
  return matchEither(
    (failure: Failure) => {
      throw new KhoraError(failure);
    },
    (value: Return) => value,
  )(either);
}
