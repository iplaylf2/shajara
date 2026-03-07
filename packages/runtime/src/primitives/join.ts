import type { RuntimePlan, ScopeRef } from "#src/contracts";
import { liftBlueprint, unwrapEither } from "#src/boundary";
import { join as kernelJoin } from "@shajara/kernel";

export function* join<Return>(spawned: ScopeRef<Return>): RuntimePlan<Return> {
  const outcome = yield* liftBlueprint(() => kernelJoin(spawned))();
  return unwrapEither(outcome);
}
