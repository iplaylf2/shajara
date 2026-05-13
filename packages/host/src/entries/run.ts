import type { RunOptions, StatefulPromise } from "#/entry-kit";
import type { RiteRoutine } from "#/contracts";
import { ensureExecutor } from "#/executor";
import { launchEntry } from "#/entry-kit";

/**
 * Starts a routine in a root scope managed by `@shajara/host`.
 *
 * @param ritual - Routine to run.
 * @param options - Optional launch controls.
 * @returns Promise with a live lifecycle `status`.
 */
export function run<Return>(
  ritual: RiteRoutine<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();

  return launchEntry(executor, executor.scope, ritual, options).settled;
}
