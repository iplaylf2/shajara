import type { RuntimeBlueprint } from "#src/contracts";
import { awaitExecution } from "#src/operations-kit/await-execution";
import { ensureExecutor } from "@khora/kernel";
import { lowerPlan } from "#src/adapter/plan-lower";

export function run<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  const executor = ensureExecutor();
  return awaitExecution(executor.launch(executor.rootScope, () => lowerPlan(runtimeBlueprint())));
}
