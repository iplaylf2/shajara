import type { RunOptions, StatefulPromise } from "#/entry-kit";
import type { RiteRoutine } from "#/contracts";
import { ensureExecutor } from "#/executor";
import { launchEntry } from "#/entry-kit";

/**
 * Starts a routine in a root scope.
 *
 * @returns Stateful promise that resolves with the routine result or rejects when the
 * launched scope fails or is canceled.
 */
export function run<Return>(
  routine: RiteRoutine<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();

  return launchEntry(executor, executor.scope, routine, options).settled;
}
