import type { ArrayValues, NonEmptyTuple } from "type-fest";
import { decodeRituals, encodeRitual } from "#/boundary/index";
import type { RiteCoroutine } from "#/contracts";
import type { RiteRoutineTuple } from "#/boundary/index";
import { race as kernelRace } from "@shajara/kernel";
import { waitOutcome } from "#/primitives-kit";

export function* race<Returns extends NonEmptyTuple<unknown>>(
  routines: RiteRoutineTuple<Returns>,
): RiteCoroutine<ArrayValues<Returns>> {
  const outcome = yield* encodeRitual(() => kernelRace<Returns>(decodeRituals(routines)))();
  return yield* waitOutcome(outcome);
}
