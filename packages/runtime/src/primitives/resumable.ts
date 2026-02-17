import type { RuntimeBlueprint } from "#src/blueprint";
import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

export const resumable = <ReturnValue>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<ReturnValue> => notImplementedRuntimePrimitive("resumable");
