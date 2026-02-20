import type { RuntimeBlueprint } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { executionAsPromise } from "#src/operations-kit/execution-as-promise";
import { lowerPlan } from "#src/adapter/plan-lower";

export function run<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  const executor = ensureExecutor();
  return executionAsPromise(
    executor.launch(executor.rootScope, () => lowerPlan(runtimeBlueprint())),
  );
}
