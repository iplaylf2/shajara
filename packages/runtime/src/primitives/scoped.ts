import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { scoped as kernelScoped } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";
import { unwrapEither } from "#src/primitives-kit";

export function* scoped<Return>(blueprint: RuntimeBlueprint<Return>): RuntimePlan<Return> {
  const either = yield* liftPlan(kernelScoped(() => lowerPlan(blueprint())));
  return unwrapEither(either);
}
