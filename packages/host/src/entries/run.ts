import type { RunOptions, StatefulPromise } from "#/entry-kit/index.js";
import type { RiteRoutine } from "#/contracts/index.js";
import { ensureExecutor } from "#/executor/index.js";
import { launchEntry } from "#/entry-kit/index.js";

/**
 * Starts a routine in a root scope.
 *
 * @returns Stateful promise for the routine result and lifecycle state.
 */
export function run<Return>(
  routine: RiteRoutine<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();

  return launchEntry(executor, executor.scope, routine, options).settled;
}
