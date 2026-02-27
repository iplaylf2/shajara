import type { RuntimePlan } from "#src/contracts";
import type { SpawnRef } from "@khora/kernel";
import { join as kernelJoin } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { unwrapEither } from "#src/primitives-kit";

export function* join<Return>(spawned: SpawnRef<Return>): RuntimePlan<Return> {
  const either = yield* liftPlan(kernelJoin(spawned));
  return unwrapEither(either);
}
