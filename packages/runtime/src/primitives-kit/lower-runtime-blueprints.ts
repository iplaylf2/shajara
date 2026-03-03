import type { ArrayValues } from "type-fest";
import type { Blueprint } from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";
import { lowerPlan } from "#src/adapter/lower-plan";

export function lowerRuntimeBlueprints<Returns extends readonly unknown[]>(
  blueprints: RuntimeBlueprintTuple<Returns>,
): {
  readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
} {
  return blueprints.map((blueprint) => () => lowerPlan(blueprint())) as {
    readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
  };
}

export type RuntimeBlueprintTuple<Returns extends readonly unknown[]> = {
  readonly [Index in keyof Returns]: RuntimeBlueprint<Returns[Index]>;
};

export type RuntimeBlueprintValue<Returns extends readonly unknown[]> = ArrayValues<Returns>;
