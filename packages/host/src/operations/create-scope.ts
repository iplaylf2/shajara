import type { LaunchStatus, RiteRoutine } from "#/contracts";
import type { RunOptions, StatefulPromise } from "#/operations-kit";
import { ensureExecutor } from "#/executor";
import { launch } from "#/operations-kit";
import { park } from "#/primitives";

export function createScope(): Scope {
  const executor = ensureExecutor();
  const launchedScope = launch(executor, executor.rootScope, park);
  const closed: Promise<void> = Promise.resolve(launchedScope.settled);

  return {
    cancel: cancelScope,
    closed,
    run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return> {
      return launch(executor, launchedScope.scope, ritual, options).settled;
    },
    get status(): ScopeStatus {
      return launchedScope.settled.status;
    },
    [Symbol.asyncDispose](): Promise<void> {
      return cancelScope();
    },
  };

  async function cancelScope(): Promise<void> {
    if (launchedScope.settled.status === "open") {
      executor.cancel(launchedScope.scope);
    }
    await closed;
  }
}

export interface Scope {
  run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return>;
  cancel(): Promise<void>;
  readonly status: ScopeStatus;
  readonly closed: Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type ScopeStatus = LaunchStatus;
