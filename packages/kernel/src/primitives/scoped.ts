import type { Either } from "fp-ts/Either";
import type { KhoraFailure } from "#src/contracts/failure";
import type { Plan } from "#src/contracts/plan";
import type { ScopeSpec } from "#src/contracts/scope";
import { notImplemented } from "#src/internal/not-implemented";

export type ResumableErrorHandler<CaughtValue> = (error: Error) => Plan<CaughtValue>;
export interface ScopedOptions<CaughtValue> {
  readonly onResumableError?: ResumableErrorHandler<CaughtValue>;
  readonly spec?: ScopeSpec<string>;
}

export function scoped<Return, CaughtValue>(
  _plan: Plan<Return>,
  _options?: ScopedOptions<CaughtValue>,
): Plan<Either<KhoraFailure, Return | CaughtValue>> {
  return notImplemented("kernel primitive 'scoped'");
}
