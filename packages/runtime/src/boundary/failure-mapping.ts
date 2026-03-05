import { ExternalError, ScopeHaltedError, ScopeTerminatedError } from "#src/errors";
import type { ExternalFailure, Failure } from "@khora/kernel";
import { KhoraError } from "#src/contracts";
import { externalFailure } from "@khora/kernel";

export function toFailure(error: Error): Failure {
  if (error instanceof KhoraError) {
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

export function fromFailure(failure: Failure): KhoraError {
  switch (failure.kind) {
    case "scope-halted":
      return new ScopeHaltedError();
    case "scope-terminated":
      return new ScopeTerminatedError();
    case "external": {
      const external = failure as ExternalFailure;
      return new ExternalError(external.raw, external.message());
    }
    default:
      throw new Error(`Unsupported failure kind in runtime mapping: ${failure.kind}`);
  }
}
