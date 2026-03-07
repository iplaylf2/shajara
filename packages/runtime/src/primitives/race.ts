import type { ArrayValues, NonEmptyTuple } from "type-fest";
import { liftBlueprint, lowerBlueprints, unwrapEither } from "#src/boundary";
import type { RiteRoutineTuple } from "#src/boundary";
import type { RiteCoroutine } from "#src/contracts";
import { race as kernelRace } from "@shajara/kernel";

export function* race<Returns extends NonEmptyTuple<unknown>>(
  primitives: RiteRoutineTuple<Returns>,
): RiteCoroutine<ArrayValues<Returns>> {
  const outcome = yield* liftBlueprint(() => kernelRace<Returns>(lowerBlueprints(primitives)))();
  return unwrapEither(outcome);
}
