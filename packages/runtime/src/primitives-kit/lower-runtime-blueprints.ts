import type { ArrayValues } from "type-fest";
import type { Plan } from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";
import { lowerPlan } from "#src/adapter/plan-lower";

export type RuntimeBlueprintTuple<ReturnValues extends readonly unknown[]> = {
  readonly [Index in keyof ReturnValues]: RuntimeBlueprint<ReturnValues[Index]>;
};

export type RuntimeBlueprintValue<ReturnValues extends readonly unknown[]> =
  ArrayValues<ReturnValues>;

export function lowerRuntimeBlueprints<ReturnValues extends readonly unknown[]>(
  runtimeBlueprints: RuntimeBlueprintTuple<ReturnValues>,
): {
  readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]>;
} {
  return runtimeBlueprints.map((runtimeBlueprint) => lowerPlan(runtimeBlueprint())) as {
    readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]>;
  };
}
