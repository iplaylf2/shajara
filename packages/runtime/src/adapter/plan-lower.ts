import type { Blueprint, Plan } from "@khora/kernel";
import type {
  RuntimeBlueprint,
  RuntimePlan,
  RuntimePrimitive,
  RuntimePrimitiveTuple,
} from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export function lowerPlan<ReturnValue>(_runtimePlan: RuntimePlan<ReturnValue>): Plan<ReturnValue> {
  return notImplemented("lowering RuntimePlan<ReturnValue> to kernel Plan<ReturnValue>");
}

export function lowerBlueprint<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Blueprint<ReturnValue> {
  return () => lowerPlan(runtimeBlueprint());
}

export function lowerPrimitiveTuple<ReturnValues extends readonly unknown[]>(
  runtimePrimitives: RuntimePrimitiveTuple<ReturnValues>,
): { readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]> };
export function lowerPrimitiveTuple(
  runtimePrimitives: ReadonlyArray<RuntimePrimitive<unknown>>,
): ReadonlyArray<Plan<unknown>> {
  return runtimePrimitives.map((runtimePrimitive) => lowerPlan(runtimePrimitive()));
}
