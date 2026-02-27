import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import type { ScopeRef, ScopeSpec } from "@khora/kernel";
import { spawn as kernelSpawn } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

export function spawn<Return, Spec extends ScopeSpec>(
  blueprint: RuntimeBlueprint<Return>,
  spec?: Spec,
): RuntimePlan<ScopeRef<Return, Spec>> {
  return liftPlan(kernelSpawn(lowerPlan(blueprint()), spec));
}
