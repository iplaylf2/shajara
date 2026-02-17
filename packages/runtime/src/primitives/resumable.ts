import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { BLUEPRINT_BRIDGE } from "#src/blueprint-bridge";
import { resumable as kernelResumable } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

const resumableKernelPrimitive = <ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>) =>
  kernelResumable(BLUEPRINT_BRIDGE.raise(runtimeBlueprint)());

export const resumable = <ReturnValue>(
  blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<ReturnValue> => liftPlan(resumableKernelPrimitive(blueprint));
