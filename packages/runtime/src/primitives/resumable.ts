import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const resumable = <ReturnValue>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<ReturnValue> => notImplementedRuntimePrimitive("resumable");
