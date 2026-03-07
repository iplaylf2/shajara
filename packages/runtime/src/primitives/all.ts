import { liftBlueprint, lowerBlueprints, unwrapEither } from "#src/boundary";
import type { RiteRoutineTuple } from "#src/boundary";
import type { RiteCoroutine } from "#src/contracts";
import type { UnknownArray } from "type-fest";
import { all as kernelAll } from "@shajara/kernel";

export function* all<Returns extends UnknownArray>(
  primitives: RiteRoutineTuple<Returns>,
): RiteCoroutine<Returns> {
  const outcome = yield* liftBlueprint(() => kernelAll(lowerBlueprints(primitives)))();
  return unwrapEither(outcome);
}
