import type { RunOptions, StatefulPromise } from "#src/operations-kit";
import type { RiteRoutine } from "#src/contracts";
import { ensureExecutor } from "@shajara/kernel";
import { launch } from "#src/operations-kit";

export function run<Return>(
  blueprint: RiteRoutine<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();
  return launch(executor, executor.rootScope, blueprint, options).settled;
}
