import type { FutureResult } from "#/contracts";
import type { ProcessStep } from "#/interpreter";
import { either } from "fp-ts";

export function unwrapExited<Result>(step: ProcessStep<Result>): FutureResult<Result> {
  if (step.disposition !== "exited") {
    throw new Error("Expected entry process to exit");
  }

  return step.result;
}

export function unwrapRight<Right>(value: either.Either<unknown, Right>): Right {
  if (!either.isRight(value)) {
    throw new Error("Expected Either to be Right");
  }

  return value.right;
}
