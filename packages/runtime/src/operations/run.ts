import type { RuntimeBlueprint } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { launchRuntimeBlueprintInScope } from "#src/operations-kit/launch-runtime-blueprint";

export function run<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  const executor = ensureExecutor();
  return launchRuntimeBlueprintInScope(executor.rootScope(), runtimeBlueprint);
}
