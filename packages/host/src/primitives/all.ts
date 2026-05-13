import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { decodeRituals, encodeRitual } from "#/boundary/index";
import type { RiteRoutineTuple } from "#/boundary/index";
import type { UnknownArray } from "type-fest";
import { all as kernelAll } from "@shajara/kernel";

/**
 * Starts routines concurrently in the current scope without waiting for them.
 *
 * @returns Future whose successful result preserves routine order.
 */
export function all<Returns extends UnknownArray>(
  routines: RiteRoutineTuple<Returns>,
): RiteCoroutine<RiteFuture<Returns>> {
  return encodeRitual(() => kernelAll(decodeRituals(routines)))();
}
