import type { EntryLaunchServices, RunOptions, StatefulPromise } from "#/entry-kit";
import { EntryLaunch } from "#/entry-kit";
import type { RiteRoutine } from "#/contracts";
import { ensureExecutor } from "#/executor";

export function run<Return>(
  ritual: RiteRoutine<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();
  const services: EntryLaunchServices = {
    cancelScope: (scope) => executor.cancel(scope),
    launchInScope: (scope, entry) => executor.launch(scope, entry),
  };

  return EntryLaunch.create(executor.scope, ritual, services, options).settled;
}
