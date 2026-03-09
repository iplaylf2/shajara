import type { LaunchState, RiteRoutine } from "#src/contracts";
import type { RunOptions, StatefulPromise } from "#src/operations-kit";
import { ensureExecutor } from "@shajara/kernel";
import { launch } from "#src/operations-kit";
import { park } from "#src/primitives";

export function createScope(): HostScope {
  const executor = ensureExecutor();
  const launchedScope = launch(executor, executor.rootScope, park);
  const closed: Promise<void> = Promise.resolve(launchedScope.settled);

  return {
    [Symbol.asyncDispose](): Promise<void> {
      return haltScope();
    },
    closed,
    halt: haltScope,
    run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return> {
      return launch(executor, launchedScope.scope, ritual, options).settled;
    },
    get state(): HostScopeState {
      return launchedScope.settled.state();
    },
  };

  async function haltScope(): Promise<void> {
    if (launchedScope.settled.state() === "open") {
      executor.terminate(launchedScope.scope);
    }
    await closed;
  }
}

export interface HostScope {
  run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return>;
  halt(): Promise<void>;
  readonly state: HostScopeState;
  readonly closed: Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type HostScopeState = LaunchState;
