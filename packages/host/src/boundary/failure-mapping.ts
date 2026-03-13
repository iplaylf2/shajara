import { ExternalError, ScopeHaltedError, ScopeTerminatedError } from "#src/errors";
import type { ExternalFailure, FailureShape } from "@shajara/kernel";
import type { Failure } from "#src/contracts";
import { ShajaraError } from "#src/contracts";
import { externalFailure } from "@shajara/kernel";

export function toFailure(error: Error): Failure {
  if (error instanceof ShajaraError) {
    return error.toFailure();
  }
  return externalFailure(error, () => `${error.name}: ${error.message}`);
}

export function toFailureUnknown(caught: unknown): Failure {
  if (caught instanceof Error) {
    return toFailure(caught);
  }
  return externalFailure(caught, () => String(caught));
}

export function fromFailure(failure: FailureShape): Error {
  switch (failure.kind) {
    case "scope-halted":
      return new ScopeHaltedError();
    case "scope-terminated":
      return new ScopeTerminatedError();
    case "external": {
      const external = failure as ExternalFailure;
      if (external.raw instanceof Error) {
        return external.raw;
      }
      return new ExternalError(external.raw, external.message());
    }
    default:
      return new ExternalError(failure, failure.message());
  }
}
