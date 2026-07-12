import {
  CanceledError,
  ChannelError,
  ExternalError,
  InterruptedError,
  ScopeError,
  UnfulfilledError,
} from "#/errors/index.js";
import type { Failure } from "#/contracts/index.js";
import type { ScopeExitError } from "#/errors/index.js";
import type { ScopeExitFailure } from "@shajara/kernel";
import { ShajaraError } from "#/contracts/index.js";
import { externalFailure } from "@shajara/kernel";

/**
 * Converts a JavaScript `Error` into an in-band failure.
 * Existing `ShajaraError` instances keep their failure identity.
 *
 * @returns Failure value suitable for settlement.
 */
export function toFailure(error: Error): Failure {
  if (error instanceof ShajaraError) {
    return error as Failure;
  }
  return externalFailure(error, `${error.name}: ${error.message}`);
}

/** Converts any caught JavaScript value into an in-band failure. */
export function toFailureUnknown(caught: unknown): Failure {
  if (caught instanceof Error) {
    return toFailure(caught);
  }
  return externalFailure(caught, String(caught));
}

/** Converts a scope-exit failure into the error passed to recovery handlers. */
export function fromFailure(failure: ScopeExitFailure): ScopeExitError;

/**
 * Converts an in-band failure into a JavaScript error.
 * Existing `ShajaraError` failures are returned unchanged.
 * External failures carrying an `Error` return the original error.
 *
 * @returns Error represented by the failure.
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
    case "unfulfilled": {
      return new UnfulfilledError();
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

export type { ScopeExitFailure } from "@shajara/kernel";
