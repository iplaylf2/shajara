import type { Either } from "@shajara/kernel/utils";
import type { Failure } from "#/contracts";
import { fromFailure } from "./failure-mapping";
import { isLeft } from "@shajara/kernel/utils";

export function unwrapEither<Return>(either: Either<Failure, Return>): Return {
  if (isLeft(either)) {
    throw fromFailure(either.left);
  } else {
    return either.right;
  }
}
