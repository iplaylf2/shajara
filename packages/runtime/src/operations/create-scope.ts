import type { RunOptions, StatefulPromise } from "#src/operations-kit/runtime-launch";
import type { LaunchState } from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { runtimeLaunch } from "#src/operations-kit/runtime-launch";
import { suspend } from "#src/primitives/suspend";

export interface RuntimeScope {
  run<Return>(
    runtimeBlueprint: RuntimeBlueprint<Return>,
    options?: RunOptions,
  ): StatefulPromise<Return>;
  halt(): Promise<void>;
  readonly state: RuntimeScopeState;
  readonly closed: Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type RuntimeScopeState = LaunchState;

export function createScope(): RuntimeScope {
  const executor = ensureExecutor();
  const launchedScope = runtimeLaunch(executor, executor.rootScope, suspend);
  const closed: Promise<void> = Promise.resolve(launchedScope.settled);

  return {
    [Symbol.asyncDispose](): Promise<void> {
      return haltScope();
    },
    closed,
    halt: haltScope,
    run<Return>(
      runtimeBlueprint: RuntimeBlueprint<Return>,
      options?: RunOptions,
    ): StatefulPromise<Return> {
      return runtimeLaunch(executor, launchedScope.scope, runtimeBlueprint, options).settled;
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
