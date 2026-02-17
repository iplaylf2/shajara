import type { RuntimeBlueprint } from "#src/blueprint";
import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

export type RuntimeResumableErrorHandler<CaughtValue> = (error: Error) => RuntimePlan<CaughtValue>;

export const scoped = <ReturnValue, CaughtValue = never>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
  _onResumableError?: RuntimeResumableErrorHandler<CaughtValue> | undefined,
): RuntimePlan<ReturnValue | CaughtValue> => notImplementedRuntimePrimitive("scoped");
