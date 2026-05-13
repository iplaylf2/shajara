import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { decodeRituals, encodeRitual } from "#/boundary/index";
import type { RiteRoutineTuple } from "#/boundary/index";
import type { UnknownArray } from "type-fest";
import { all as kernelAll } from "@shajara/kernel";

/**
 * Runs routines concurrently in the current scope.
 *
 * @param routines - Child routines to start.
 * @returns Future that settles with the ordered routine results.
 */
export function all<Returns extends UnknownArray>(
  routines: RiteRoutineTuple<Returns>,
): RiteCoroutine<RiteFuture<Returns>> {
  return encodeRitual(() => kernelAll(decodeRituals(routines)))();
}
