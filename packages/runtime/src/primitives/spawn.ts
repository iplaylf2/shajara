import type { RuntimeBlueprint, RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import type { Plan } from "@khora/kernel";
import { spawn as kernelSpawn } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

const spawnKernelPrimitive = <ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Plan<RuntimeSpawnRef<ReturnValue>> =>
  kernelSpawn<ReturnValue, RuntimeSpawnRef<ReturnValue>>(lowerPlan(runtimeBlueprint()));

export const spawn = <ReturnValue>(
  blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<RuntimeSpawnRef<ReturnValue>> => liftPlan(spawnKernelPrimitive(blueprint));
