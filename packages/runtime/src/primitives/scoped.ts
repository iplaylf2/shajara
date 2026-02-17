import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export type RuntimeResumableErrorHandler<CaughtValue> = (error: Error) => RuntimePlan<CaughtValue>;

export const scoped = <ReturnValue, CaughtValue = never>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
  _onResumableError?: RuntimeResumableErrorHandler<CaughtValue> | undefined,
): RuntimePlan<ReturnValue | CaughtValue> => notImplementedRuntimePrimitive("scoped");
