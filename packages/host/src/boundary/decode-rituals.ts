import type { RiteRoutine } from "#/contracts/index.js";
import type { Ritual } from "@shajara/kernel";
import { decodeRitual } from "./decode-ritual.js";

/**
 * Converts a tuple of host routines into kernel rituals.
 *
 * @returns Tuple whose item return types mirror the input routines.
 */
export function decodeRituals<Returns extends readonly unknown[]>(
  routines: RiteRoutineTuple<Returns>,
): {
  readonly [Index in keyof Returns]: Ritual<Returns[Index]>;
} {
  return routines.map(decodeRitual) as {
    readonly [Index in keyof Returns]: Ritual<Returns[Index]>;
  };
}

/** Tuple of routines whose return types mirror a result tuple. */
export type RiteRoutineTuple<Returns extends readonly unknown[]> = {
  readonly [Index in keyof Returns]: RiteRoutine<Returns[Index]>;
};
