import type { RunOptions, StatefulPromise } from "#/entry-kit/index.js";
import type { RiteRoutine } from "#/contracts/index.js";
import { launchTopLevelEntry } from "#/entry-kit/index.js";

/**
 * Starts a routine in a new top-level scope.
 *
 * @returns Stateful promise for the routine result and lifecycle state.
 */
export function run<Return>(
  routine: RiteRoutine<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  return launchTopLevelEntry(routine, options).settled;
}
