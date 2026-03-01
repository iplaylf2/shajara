import type { Either } from "@khora/kernel/utils";
import type { Failure } from "@khora/kernel";
import { fromFailure } from "./failure-mapping";
import { matchEither } from "@khora/kernel/utils";

export function unwrapEither<Return>(either: Either<Failure, Return>): Return {
  return matchEither(
    (failure: Failure) => {
      throw fromFailure(failure);
    },
    (value: Return) => value,
  )(either);
}
