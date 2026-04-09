import type { FutureResult } from "#/contracts";
import type { ProcessStep } from "#/interpreter";
import { either } from "fp-ts";

export function unwrapExited<Result>(step: ProcessStep<Result>): FutureResult<Result> {
  if (step.disposition !== "exited") {
    throw withCause(new Error("Expected entry process to exit"), step);
  }

  return step.result;
}

export function unwrapRight<Right>(value: either.Either<unknown, Right>): Right {
  if (!either.isRight(value)) {
    throw withCause(new Error("Expected Either to be Right"), value);
  }

  return value.right;
}

function withCause<Failure extends Error>(error: Failure, cause: unknown): Failure {
  return Object.assign(error, { cause });
}
