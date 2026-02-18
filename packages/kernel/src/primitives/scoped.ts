import type { Plan } from "#src/plan-contract";
import { notImplemented } from "#src/internal/not-implemented";

export type KernelResumableErrorHandler<CaughtValue> = (error: Error) => Plan<CaughtValue>;

export function scoped<ReturnValue, CaughtValue = never>(
  _plan: Plan<ReturnValue>,
  _onResumableError?: KernelResumableErrorHandler<CaughtValue> | undefined,
): Plan<ReturnValue | CaughtValue> {
  return notImplemented("kernel primitive 'scoped'");
}
