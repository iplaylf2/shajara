import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { resumable as kernelResumable } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

export const resumable = <ReturnValue>(
  blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<ReturnValue> => liftPlan(kernelResumable(lowerPlan(blueprint())));
