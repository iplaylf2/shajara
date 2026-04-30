import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { decodeRituals, encodeRitual } from "#/boundary";
import type { RiteRoutineTuple } from "#/boundary";
import { race as kernelRace } from "@shajara/kernel";

export function race<Returns extends NonEmptyTuple<unknown>>(
  routines: RiteRoutineTuple<Returns>,
): RiteCoroutine<RiteFuture<ArrayValues<Returns>>> {
  return encodeRitual(() => kernelRace<Returns>(decodeRituals(routines)))();
}
