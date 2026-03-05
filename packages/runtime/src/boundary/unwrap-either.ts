import type { Either } from "@khora/kernel/utils";
import type { Failure } from "#src/contracts";
import { fromFailure } from "./failure-mapping";
import { isLeft } from "@khora/kernel/utils";

export function unwrapEither<Return>(either: Either<Failure, Return>): Return {
  if (isLeft(either)) {
    throw fromFailure(either.left);
  } else {
    return either.right;
  }
}
