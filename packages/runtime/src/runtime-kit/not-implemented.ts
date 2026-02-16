import type { RuntimePlan } from "./runtime-protocol";

function notImplementedRuntimePrimitive<ReturnValue>(
  primitiveName: string,
): RuntimePlan<ReturnValue> {
  throw new Error(`Not implemented: runtime primitive '${primitiveName}'.`);
}

export { notImplementedRuntimePrimitive };
