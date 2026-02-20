import type { Plan, SpawnRef } from "@khora/kernel";
import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { spawn as kernelSpawn } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

const spawnKernelPrimitive = <ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Plan<SpawnRef<ReturnValue>> =>
  kernelSpawn<ReturnValue, SpawnRef<ReturnValue>>(lowerPlan(runtimeBlueprint()));

export const spawn = <ReturnValue>(
  blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<SpawnRef<ReturnValue>> => liftPlan(spawnKernelPrimitive(blueprint));
