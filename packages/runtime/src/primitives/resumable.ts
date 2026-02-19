import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { resumable as kernelResumable } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

const resumableKernelPrimitive = <ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>) =>
  kernelResumable(lowerPlan(runtimeBlueprint()));

export const resumable = <ReturnValue>(
  blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<ReturnValue> => liftPlan(resumableKernelPrimitive(blueprint));
