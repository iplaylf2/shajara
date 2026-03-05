import type { Blueprint } from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";
import type { UnknownArray } from "type-fest";
import { lowerBlueprint } from "#src/boundary/lower-blueprint";

export function lowerBlueprints<Returns extends UnknownArray>(
  blueprints: RuntimeBlueprintTuple<Returns>,
): {
  readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
} {
  return blueprints.map((blueprint) => lowerBlueprint(blueprint)) as {
    readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
  };
}

export type RuntimeBlueprintTuple<Returns extends UnknownArray> = {
  readonly [Index in keyof Returns]: RuntimeBlueprint<Returns[Index]>;
};
