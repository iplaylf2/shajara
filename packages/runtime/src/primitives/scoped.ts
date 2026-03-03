import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { scoped as kernelScoped } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/lift-plan";
import { lowerPlan } from "#src/adapter/lower-plan";
import { unwrapEither } from "#src/primitives-kit";

export function* scoped<Return>(blueprint: RuntimeBlueprint<Return>): RuntimePlan<Return> {
  const either = yield* liftPlan(kernelScoped(() => lowerPlan(blueprint())));
  return unwrapEither(either);
}
