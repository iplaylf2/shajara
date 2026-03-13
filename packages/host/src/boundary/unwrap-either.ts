import type { Either } from "@shajara/kernel/utils";
import type { FailureShape } from "@shajara/kernel";
import { fromFailure } from "./failure-mapping";
import { isLeft } from "@shajara/kernel/utils";

export function unwrapEither<Return>(either: Either<FailureShape, Return>): Return {
  if (isLeft(either)) {
    throw fromFailure(either.left);
  } else {
    return either.right;
  }
}
