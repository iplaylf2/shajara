import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import type { SpawnRef } from "@khora/kernel";
import { spawn as kernelSpawn } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

export const spawn = <ReturnValue>(
  blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<SpawnRef<ReturnValue>> =>
  liftPlan(kernelSpawn<ReturnValue, SpawnRef<ReturnValue>>(lowerPlan(blueprint())));
