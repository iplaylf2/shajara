import type { RuntimePlan, ScopeRef } from "#src/contracts";
import { join as kernelJoin } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { unwrapEither } from "#src/primitives-kit";

export function* join<Return>(spawned: ScopeRef<Return>): RuntimePlan<Return> {
  const either = yield* liftPlan(kernelJoin(spawned));
  return unwrapEither(either);
}
