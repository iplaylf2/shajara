import type { RiteRoutine } from "#/contracts";
import type { Ritual } from "@shajara/kernel";
import type { UnknownArray } from "type-fest";
import { decodeRitual } from "./decode-ritual";

/**
 * Converts a tuple of `RiteRoutine` entries into kernel `Ritual` entries.
 *
 * @param routines - Routines to convert.
 * @returns Tuple of kernel rituals with matching result positions.
 */
export function decodeRituals<Returns extends UnknownArray>(
  routines: RiteRoutineTuple<Returns>,
): {
  readonly [Index in keyof Returns]: Ritual<Returns[Index]>;
} {
  return routines.map(decodeRitual) as {
    readonly [Index in keyof Returns]: Ritual<Returns[Index]>;
  };
}

/** Tuple of routines whose return types mirror a result tuple. */
export type RiteRoutineTuple<Returns extends UnknownArray> = {
  readonly [Index in keyof Returns]: RiteRoutine<Returns[Index]>;
};
