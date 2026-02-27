import type { KhoraFailure, Plan, ScopeSpec } from "#src/contracts";
import type { Either } from "fp-ts/Either";
import { notImplemented } from "#src/internal/not-implemented";

export type ResumableFailureHandler = (failure: KhoraFailure) => Plan<unknown>;
export interface ScopedOptions {
  readonly onResumableFailure?: ResumableFailureHandler;
  readonly spec?: ScopeSpec;
}

export function scoped<Return>(
  _plan: Plan<Return>,
  _options?: ScopedOptions,
): Plan<Either<KhoraFailure, Return>> {
  return notImplemented("kernel primitive 'scoped'");
}
