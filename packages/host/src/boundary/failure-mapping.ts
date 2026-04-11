import { CanceledError, ExternalError, InterruptedError, ScopeError } from "#/errors";
import type { Failure } from "#/contracts";
import { ShajaraError } from "#/contracts";
import { externalFailure } from "@shajara/kernel";

export function toFailure(error: Error): Failure {
  if (error instanceof ShajaraError) {
    return error as Failure;
  }
  return externalFailure(error, `${error.name}: ${error.message}`);
}

export function toFailureUnknown(caught: unknown): Failure {
  if (caught instanceof Error) {
    return toFailure(caught);
  }
  return externalFailure(caught, String(caught));
}

export function fromFailure(failure: Failure): Error {
  if (failure instanceof ShajaraError) {
    return failure;
  }

  switch (failure.kind) {
    case "scope": {
      return new ScopeError(failure);
    }
    case "canceled": {
      return new CanceledError();
    }
    case "interrupted": {
      return new InterruptedError(failure);
    }
    case "external": {
      if (failure.raw instanceof Error) {
        return failure.raw;
      }

      return new ExternalError(failure.raw, failure.message);
    }
  }
}
