import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import type { ScopeRef, ScopeSpec } from "@khora/kernel";
import type { StandardScopeSpec } from "@khora/kernel/scopes";
import { spawn as kernelSpawn } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";
import { standardScopeSpec } from "@khora/kernel/scopes";

export function spawn<Return, Spec extends ScopeSpec = StandardScopeSpec>(
  blueprint: RuntimeBlueprint<Return>,
  spec = standardScopeSpec() as Spec,
): RuntimePlan<ScopeRef<Return, Spec>> {
  return liftPlan(kernelSpawn(lowerPlan(blueprint()), spec));
}
