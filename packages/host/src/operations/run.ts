import type { RunOptions, StatefulPromise } from "#/operations-kit";
import type { RiteRoutine } from "#/contracts";
import { ensureExecutor } from "@shajara/kernel";
import { launch } from "#/operations-kit";

export function run<Return>(
  ritual: RiteRoutine<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();
  return launch(executor, executor.rootScope, ritual, options).settled;
}
