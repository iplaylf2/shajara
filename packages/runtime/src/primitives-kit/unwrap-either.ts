import type { Either } from "@khora/kernel/utils";
import type { KhoraFailure } from "@khora/kernel";
import { RuntimeKhoraError } from "#src/errors";
import { matchEither } from "@khora/kernel/utils";

export function unwrapEither<Return>(either: Either<KhoraFailure, Return>): Return {
  return matchEither(
    (failure: KhoraFailure) => {
      throw new RuntimeKhoraError(failure);
    },
    (value: Return) => value,
  )(either);
}
