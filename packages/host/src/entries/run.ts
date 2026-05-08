import type { RunOptions, StatefulPromise } from "#/entry-kit";
import type { RiteRoutine } from "#/contracts";
import { ensureExecutor } from "#/executor";
import { launchEntry } from "#/entry-kit";

export function run<Return>(
  ritual: RiteRoutine<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();

  return launchEntry(executor, executor.scope, ritual, options).settled;
}
