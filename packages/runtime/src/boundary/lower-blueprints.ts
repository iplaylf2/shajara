import type { Blueprint } from "@shajara/kernel";
import type { RiteRoutine } from "#src/contracts";
import type { UnknownArray } from "type-fest";
import { lowerBlueprint } from "./lower-blueprint";

export function lowerBlueprints<Returns extends UnknownArray>(
  blueprints: RiteRoutineTuple<Returns>,
): {
  readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
} {
  return blueprints.map((blueprint) => lowerBlueprint(blueprint)) as {
    readonly [Index in keyof Returns]: Blueprint<Returns[Index]>;
  };
}

export type RiteRoutineTuple<Returns extends UnknownArray> = {
  readonly [Index in keyof Returns]: RiteRoutine<Returns[Index]>;
};
