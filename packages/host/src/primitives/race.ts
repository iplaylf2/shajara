import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { decodeRituals, encodeRitual } from "#src/boundary";
import type { RiteRoutineTuple } from "#src/boundary";
import { race as kernelRace } from "@shajara/kernel";

export function race<Returns extends NonEmptyTuple<unknown>>(
  primitives: RiteRoutineTuple<Returns>,
): RiteCoroutine<RiteFuture<ArrayValues<Returns>>> {
  return encodeRitual(() => kernelRace<Returns>(decodeRituals(primitives)))();
}
