import { liftBlueprint, lowerBlueprints, unwrapEither } from "#src/boundary";
import type { RuntimeBlueprintTuple } from "#src/boundary";
import type { RuntimePlan } from "#src/contracts";
import type { UnknownArray } from "type-fest";
import { all as kernelAll } from "@khora/kernel";

export function* all<Returns extends UnknownArray>(
  primitives: RuntimeBlueprintTuple<Returns>,
): RuntimePlan<Returns> {
  const outcome = yield* liftBlueprint(() => kernelAll(lowerBlueprints(primitives)))();
  return unwrapEither(outcome);
}
