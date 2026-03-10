import type { LaunchState, RiteRoutine } from "#src/contracts";
import type { RunOptions, StatefulPromise } from "#src/operations-kit";
import { ensureExecutor } from "@shajara/kernel";
import { launch } from "#src/operations-kit";
import { park } from "#src/primitives";

export function createScope(): Scope {
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
    get state(): ScopeState {
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

export interface Scope {
  run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return>;
  halt(): Promise<void>;
  readonly state: ScopeState;
  readonly closed: Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type ScopeState = LaunchState;
