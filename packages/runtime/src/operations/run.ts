import type { RunOptions, StatefulPromise } from "#src/operations-kit/runtime-launch";
import type { RuntimeBlueprint } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { runtimeLaunch } from "#src/operations-kit/runtime-launch";

export function run<Return>(
  runtimeBlueprint: RuntimeBlueprint<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();
  return runtimeLaunch(executor, executor.rootScope, runtimeBlueprint, options).settled;
}
