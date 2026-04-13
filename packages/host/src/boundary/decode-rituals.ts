import type { RiteRoutine } from "#/contracts";
import type { Ritual } from "@shajara/kernel";
import type { UnknownArray } from "type-fest";
import { decodeRitual } from "./decode-ritual";

export function decodeRituals<Returns extends UnknownArray>(
  routines: RiteRoutineTuple<Returns>,
): {
  readonly [Index in keyof Returns]: Ritual<Returns[Index]>;
} {
  return routines.map(decodeRitual) as {
    readonly [Index in keyof Returns]: Ritual<Returns[Index]>;
  };
}

export type RiteRoutineTuple<Returns extends UnknownArray> = {
  readonly [Index in keyof Returns]: RiteRoutine<Returns[Index]>;
};
