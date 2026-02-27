import type { KhoraFailure, Plan, ScopeSpec } from "#src/contracts";
import type { Either } from "fp-ts/Either";
import { notImplemented } from "#src/internal/not-implemented";

export type ResumableErrorHandler<CaughtValue> = (error: Error) => Plan<CaughtValue>;
export interface ScopedOptions<CaughtValue> {
  readonly onResumableError?: ResumableErrorHandler<CaughtValue>;
  readonly spec?: ScopeSpec;
}

export function scoped<Return, CaughtValue>(
  _plan: Plan<Return>,
  _options?: ScopedOptions<CaughtValue>,
): Plan<Either<KhoraFailure, Return | CaughtValue>> {
  return notImplemented("kernel primitive 'scoped'");
}
