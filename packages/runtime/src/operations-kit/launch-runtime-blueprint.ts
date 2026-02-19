import type { ExecutionScopeRef } from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";
import { awaitExecution } from "#src/operations-kit/await-execution";
import { ensureExecutor } from "@khora/kernel";
import { lowerBlueprint } from "#src/adapter/plan-lower";

export function launchRuntimeBlueprintInScope<ReturnValue>(
  scope: ExecutionScopeRef,
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  return awaitExecution(ensureExecutor().launch(scope, lowerBlueprint(runtimeBlueprint)));
}
