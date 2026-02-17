import type { RuntimeBlueprint, RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import { BLUEPRINT_BRIDGE } from "#src/blueprint-bridge";
import type { Plan } from "@khora/kernel";
import { spawn as kernelSpawn } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

const spawnKernelPrimitive = <ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Plan<RuntimeSpawnRef<ReturnValue>> =>
  kernelSpawn<ReturnValue, RuntimeSpawnRef<ReturnValue>>(BLUEPRINT_BRIDGE.raise(runtimeBlueprint)());

export const spawn = <ReturnValue>(
  blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<RuntimeSpawnRef<ReturnValue>> => liftPlan(spawnKernelPrimitive(blueprint));
