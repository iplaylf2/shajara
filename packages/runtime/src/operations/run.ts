import type { RunOptions, StatefulPromise } from "#src/operations-kit";
import type { RuntimeBlueprint } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { runtimeLaunch } from "#src/operations-kit";

export function run<Return>(
  runtimeBlueprint: RuntimeBlueprint<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();
  return runtimeLaunch(executor, executor.rootScope, runtimeBlueprint, options).settled;
}
