import type { RuntimeBlueprint } from "#src/bridge/blueprint";
import type { RuntimePlan } from "#src/contracts/plan";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export const resumable = <ReturnValue>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<ReturnValue> => notImplementedRuntimePrimitive("resumable");
