import type { KernelResumableErrorHandler, Plan } from "@khora/kernel";
import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { BLUEPRINT_BRIDGE } from "#src/blueprint-bridge";
import { scoped as kernelScoped } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

export type RuntimeResumableErrorHandler<CaughtValue> = (error: Error) => RuntimePlan<CaughtValue>;

function scopedKernelPrimitive<ReturnValue, CaughtValue = never>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
  onResumableError?: RuntimeResumableErrorHandler<CaughtValue> | undefined,
): Plan<ReturnValue | CaughtValue> {
  if (!onResumableError) {
    return kernelScoped<ReturnValue, CaughtValue>(BLUEPRINT_BRIDGE.raise(runtimeBlueprint)());
  }

  const kernelOnResumableError: KernelResumableErrorHandler<CaughtValue> = (error: Error) =>
    BLUEPRINT_BRIDGE.raise(() => onResumableError(error))();

  return kernelScoped<ReturnValue, CaughtValue>(
    BLUEPRINT_BRIDGE.raise(runtimeBlueprint)(),
    kernelOnResumableError,
  );
}

export const scoped = <ReturnValue, CaughtValue = never>(
  blueprint: RuntimeBlueprint<ReturnValue>,
  onResumableError?: RuntimeResumableErrorHandler<CaughtValue> | undefined,
): RuntimePlan<ReturnValue | CaughtValue> =>
  liftPlan(scopedKernelPrimitive(blueprint, onResumableError));
