import type { RuntimeScopeExit, RuntimeSpawnRef } from "#src/runtime-kit/runtime-entities";
import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

function awaitScope(_spawned: RuntimeSpawnRef): RuntimePlan<RuntimeScopeExit> {
  return notImplementedRuntimePrimitive("awaitScope");
}

function terminate(_spawned: RuntimeSpawnRef): RuntimePlan<void> {
  return notImplementedRuntimePrimitive("terminate");
}

function halt(): RuntimePlan<never> {
  return notImplementedRuntimePrimitive("halt");
}

export { awaitScope, halt, terminate };
