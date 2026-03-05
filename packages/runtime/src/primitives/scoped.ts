import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { liftBlueprint, lowerBlueprint, unwrapEither } from "#src/boundary";
import { scoped as kernelScoped } from "@khora/kernel";

export function* scoped<Return>(blueprint: RuntimeBlueprint<Return>): RuntimePlan<Return> {
  const either = yield* liftBlueprint(() => kernelScoped(lowerBlueprint(blueprint)));
  return unwrapEither(either);
}
