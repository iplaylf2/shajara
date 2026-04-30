import type { RunOptions, RuntimeLaunchServices, StatefulPromise } from "#/operations-kit";
import type { RiteRoutine } from "#/contracts";
import { RuntimeLaunch } from "#/operations-kit";
import { ensureExecutor } from "#/executor";

export function run<Return>(
  ritual: RiteRoutine<Return>,
  options?: RunOptions,
): StatefulPromise<Return> {
  const executor = ensureExecutor();
  const services: RuntimeLaunchServices = {
    cancelScope: (scope) => executor.cancel(scope),
    launchInScope: (scope, entry) => executor.launch(scope, entry),
  };

  return RuntimeLaunch.create(executor.scope, ritual, services, options).settled;
}
