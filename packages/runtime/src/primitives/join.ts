import type { RuntimePlan, ScopeRef } from "#src/contracts";
import { join as kernelJoin } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";
import { unwrapEither } from "#src/primitives-kit";

export function* join<Return>(spawned: ScopeRef<Return>): RuntimePlan<Return> {
  const either = yield* liftBlueprint(() => kernelJoin(spawned));
  return unwrapEither(either);
}
