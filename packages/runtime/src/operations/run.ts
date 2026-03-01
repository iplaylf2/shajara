import type { RunOptions, StatefulPromise } from "#src/operations-kit";
import type { RuntimeBlueprint } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { launch } from "#src/operations-kit";

export function run<Return>(
  blueprint: RuntimeBlueprint<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();
  return launch(executor, executor.rootScope, blueprint, options).settled;
}
