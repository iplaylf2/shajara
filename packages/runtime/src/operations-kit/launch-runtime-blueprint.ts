import type { RuntimeBlueprint } from "#src/contracts";
import type { ScopeRef } from "@khora/kernel";
import { awaitExecution } from "#src/operations-kit/await-execution";
import { ensureExecutor } from "@khora/kernel";
import { lowerPlan } from "#src/adapter/plan-lower";

export function launchRuntimeBlueprintInScope<ReturnValue>(
  scope: ScopeRef,
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  return awaitExecution(ensureExecutor().launch(scope, () => lowerPlan(runtimeBlueprint())));
}
