import type { ArrayValues } from "type-fest";
import type { Blueprint } from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";
import { lowerBlueprint } from "#src/adapter/lower-blueprint";

export function lowerRuntimeBlueprints<Returns extends readonly unknown[]>(
  blueprints: RuntimeBlueprintTuple<Returns>,
): {
  readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
} {
  return blueprints.map((blueprint) => lowerBlueprint(blueprint)) as {
    readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
  };
}

export type RuntimeBlueprintTuple<Returns extends readonly unknown[]> = {
  readonly [Index in keyof Returns]: RuntimeBlueprint<Returns[Index]>;
};

export type RuntimeBlueprintValue<Returns extends readonly unknown[]> = ArrayValues<Returns>;
