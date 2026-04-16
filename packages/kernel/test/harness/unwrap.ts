import type { FutureResult } from "#/contracts";
import type { Option } from "#/utils";
import type { ProcessStep } from "#/interpreter";
import { either } from "fp-ts";
import { isSome } from "#/utils";

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

/** @public */
export function unwrapSucceeded<Result>(value: FutureResult<Result>): Result {
  return unwrapRight(value);
}

export function unwrapExitedSucceeded<Result>(step: ProcessStep<Result>): Result {
  return unwrapSucceeded(unwrapExited(step));
}

export function unwrapSome<Value>(value: Option<Value>): Value {
  if (!isSome(value)) {
    throw withCause(new Error("Expected Option to be Some"), value);
  }

  return value.value;
}

function withCause<Failure extends Error>(error: Failure, cause: unknown): Failure {
  return Object.assign(error, { cause });
}
