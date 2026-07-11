import type { RiteCoroutine, RiteFuture } from "#/contracts/index.js";
import { decodeRituals, encodeRitual } from "#/boundary/index.js";
import type { RiteRoutineTuple } from "#/boundary/index.js";
import { all as kernelAll } from "@shajara/kernel";

/**
 * Starts routines concurrently in the current scope and returns without waiting.
 *
 * @returns Future that settles successfully with values in routine order.
 */
export function all<const Returns extends readonly unknown[]>(
  routines: RiteRoutineTuple<Returns>,
): RiteCoroutine<RiteFuture<Returns>> {
  return encodeRitual(() => kernelAll(decodeRituals(routines)))();
}
