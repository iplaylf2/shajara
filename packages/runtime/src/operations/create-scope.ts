import type { LaunchState, RuntimeBlueprint } from "#src/contracts";
import type { RunOptions, StatefulPromise } from "#src/operations-kit";
import { ensureExecutor } from "@shajara/kernel";
import { launch } from "#src/operations-kit";
import { suspend } from "#src/primitives";

export function createScope(): RuntimeScope {
  const executor = ensureExecutor();
  const launchedScope = launch(executor, executor.rootScope, suspend);
  const closed: Promise<void> = Promise.resolve(launchedScope.settled);

  return {
    [Symbol.asyncDispose](): Promise<void> {
      return haltScope();
    },
    closed,
    halt: haltScope,
    run<Return>(
      blueprint: RuntimeBlueprint<Return>,
      options?: RunOptions,
    ): StatefulPromise<Return> {
      return launch(executor, launchedScope.scope, blueprint, options).settled;
    },
    get state(): RuntimeScopeState {
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

export interface RuntimeScope {
  run<Return>(blueprint: RuntimeBlueprint<Return>, options?: RunOptions): StatefulPromise<Return>;
  halt(): Promise<void>;
  readonly state: RuntimeScopeState;
  readonly closed: Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type RuntimeScopeState = LaunchState;
