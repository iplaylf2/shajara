import type { ArrayValues } from "type-fest";
import type { Blueprint } from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";
import { lowerPlan } from "#src/adapter/plan-lower";

export type RuntimeBlueprintTuple<Returns extends readonly unknown[]> = {
  readonly [Index in keyof Returns]: RuntimeBlueprint<Returns[Index]>;
};

export type RuntimeBlueprintValue<Returns extends readonly unknown[]> = ArrayValues<Returns>;

export function lowerRuntimeBlueprints<Returns extends readonly unknown[]>(
  runtimeBlueprints: RuntimeBlueprintTuple<Returns>,
): {
  readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
} {
  return runtimeBlueprints.map((runtimeBlueprint) => () => lowerPlan(runtimeBlueprint())) as {
    readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
  };
}
