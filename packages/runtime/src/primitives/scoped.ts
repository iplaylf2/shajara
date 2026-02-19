import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import type { Plan } from "@khora/kernel";
import type { ResumableErrorHandler } from "@khora/kernel/primitives";
import { scoped as kernelScoped } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

export type RuntimeResumableErrorHandler<CaughtValue> = (error: Error) => RuntimePlan<CaughtValue>;

function scopedKernelPrimitive<ReturnValue, CaughtValue = never>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
  onResumableError?: RuntimeResumableErrorHandler<CaughtValue> | undefined,
): Plan<ReturnValue | CaughtValue> {
  if (!onResumableError) {
    return kernelScoped<ReturnValue, CaughtValue>(lowerPlan(runtimeBlueprint()));
  }

  const kernelOnResumableError: ResumableErrorHandler<CaughtValue> = (error: Error) =>
    lowerPlan(onResumableError(error));

  return kernelScoped<ReturnValue, CaughtValue>(
    lowerPlan(runtimeBlueprint()),
    kernelOnResumableError,
  );
}

export const scoped = <ReturnValue, CaughtValue = never>(
  blueprint: RuntimeBlueprint<ReturnValue>,
  onResumableError?: RuntimeResumableErrorHandler<CaughtValue> | undefined,
): RuntimePlan<ReturnValue | CaughtValue> =>
  liftPlan(scopedKernelPrimitive(blueprint, onResumableError));
