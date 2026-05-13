import { CanceledError, ChannelError, ExternalError, InterruptedError, ScopeError } from "#/errors";
import type { CanceledFailure, ScopeFailure } from "@shajara/kernel";
import type { Failure } from "#/contracts";
import type { ScopeExitError } from "#/errors";
import { ShajaraError } from "#/contracts";
import { externalFailure } from "@shajara/kernel";

/**
 * Converts a JavaScript `Error` into a shajara failure.
 *
 * @param error - Error thrown or rejected by JavaScript code.
 * @returns Shajara failure for the error.
 */
export function toFailure(error: Error): Failure {
  if (error instanceof ShajaraError) {
    return error as Failure;
  }
  return externalFailure(error, `${error.name}: ${error.message}`);
}

/**
 * Converts any caught JavaScript value into a shajara failure.
 *
 * @param caught - Value thrown or rejected by JavaScript code.
 * @returns Shajara failure for the value.
 */
export function toFailureUnknown(caught: unknown): Failure {
  if (caught instanceof Error) {
    return toFailure(caught);
  }
  return externalFailure(caught, String(caught));
}

/**
 * Converts a scope-exit failure into the JavaScript error passed to recovery handlers.
 *
 * @param failure - Scope-exit failure to convert.
 * @returns Canceled or scope error.
 */
export function fromFailure(failure: ScopeExitFailure): ScopeExitError;

/**
 * Converts a shajara failure into the JavaScript error callers receive.
 *
 * @param failure - Failure to convert.
 * @returns JavaScript error for the failure.
 */
export function fromFailure(failure: Failure): Error;
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
    case "channel": {
      return new ChannelError({ cause: failure.cause, kind: "cause" }, failure.message);
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

type ScopeExitFailure = CanceledFailure | ScopeFailure;
