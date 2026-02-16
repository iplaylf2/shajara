import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import type { RuntimeSpawnRef } from "#src/runtime-kit/runtime-entities";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

function join<ReturnValue>(
  _spawned: RuntimeSpawnRef<ReturnValue>,
): RuntimePlan<ReturnValue> {
  return notImplementedRuntimePrimitive("join");
}

function terminate(_spawned: RuntimeSpawnRef): RuntimePlan<void> {
  return notImplementedRuntimePrimitive("terminate");
}

function halt(): RuntimePlan<never> {
  return notImplementedRuntimePrimitive("halt");
}

export { halt, join, terminate };
