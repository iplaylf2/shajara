import type { RuntimePlan, ScopeRef } from "#src/contracts";
import { liftBlueprint, unwrapEither } from "#src/boundary";
import { join as kernelJoin } from "@khora/kernel";

export function* join<Return>(spawned: ScopeRef<Return>): RuntimePlan<Return> {
  const either = yield* liftBlueprint(() => kernelJoin(spawned));
  return unwrapEither(either);
}
