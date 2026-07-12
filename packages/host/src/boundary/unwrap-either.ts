import type { Either } from "@shajara/kernel/utils";
import type { Failure } from "#/contracts/index.js";
import { fromFailure } from "./failure-mapping.js";
import { isLeft } from "@shajara/kernel/utils";

/**
 * Extracts an `Either` value or throws the error represented by its failure side.
 *
 * @returns Right-side value.
 * @throws Error represented by the left-side failure.
 */
export function unwrapEither<Return>(either: Either<Failure, Return>): Return {
  if (isLeft(either)) {
    throw fromFailure(either.left);
  } else {
    return either.right;
  }
}
