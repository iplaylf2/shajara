import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import type { ScopeSpec } from "@khora/kernel/primitives-kit";
import type { SpawnRef } from "@khora/kernel";
import { spawn as kernelSpawn } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

export function spawn<ReturnValue>(
  blueprint: RuntimeBlueprint<ReturnValue>,
  spec?: ScopeSpec,
): RuntimePlan<SpawnRef<ReturnValue>> {
  return liftPlan(kernelSpawn(lowerPlan(blueprint()), spec));
}
