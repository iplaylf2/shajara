import type { Plan } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export type ResumableErrorHandler<CaughtValue> = (error: Error) => Plan<CaughtValue>;

export function scoped<ReturnValue, CaughtValue = never>(
  _plan: Plan<ReturnValue>,
  _onResumableError?: ResumableErrorHandler<CaughtValue> | undefined,
): Plan<ReturnValue | CaughtValue> {
  return notImplemented("kernel primitive 'scoped'");
}
