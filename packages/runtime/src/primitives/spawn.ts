import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import type { ScopeSpec } from "@khora/kernel/scopes";
import type { SpawnRef } from "@khora/kernel";
import { spawn as kernelSpawn } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

export function spawn<Return>(
  blueprint: RuntimeBlueprint<Return>,
  spec?: ScopeSpec<string>,
): RuntimePlan<SpawnRef<Return>> {
  return liftPlan(kernelSpawn(lowerPlan(blueprint()), spec));
}
