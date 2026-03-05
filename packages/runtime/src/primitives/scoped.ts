import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { scoped as kernelScoped } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";
import { lowerBlueprint } from "#src/adapter/lower-blueprint";
import { unwrapEither } from "#src/primitives-kit";

export function* scoped<Return>(blueprint: RuntimeBlueprint<Return>): RuntimePlan<Return> {
  const either = yield* liftBlueprint(() => kernelScoped(lowerBlueprint(blueprint)));
  return unwrapEither(either);
}
