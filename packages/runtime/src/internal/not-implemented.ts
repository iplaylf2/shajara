import type { RuntimePlan } from "#src/contracts/plan";

function notImplementedRuntimePrimitive<ReturnValue>(
  primitiveName: string,
): RuntimePlan<ReturnValue> {
  throw new Error(`Not implemented: runtime primitive '${primitiveName}'.`);
}

export { notImplementedRuntimePrimitive };
