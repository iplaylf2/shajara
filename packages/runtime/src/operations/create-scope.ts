import type { RunOptions, StatefulPromise } from "#src/operations-kit/runtime-launch";
import type { ExecutionScopeState } from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { runtimeLaunch } from "#src/operations-kit/runtime-launch";
import { suspend } from "#src/primitives/suspend";

export interface RuntimeScope {
  run<ReturnValue>(
    runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
    options?: RunOptions,
  ): StatefulPromise<ReturnValue>;
  halt(): Promise<void>;
  readonly state: RuntimeScopeState;
  readonly closed: Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type RuntimeScopeState = ExecutionScopeState;

export function createScope(): RuntimeScope {
  const executor = ensureExecutor();
  const managedScope = runtimeLaunch(executor, executor.rootScope, suspend);
  const closed: Promise<void> = Promise.resolve(managedScope.settled);

  return {
    [Symbol.asyncDispose](): Promise<void> {
      return haltScope();
    },
    closed,
    halt: haltScope,
    run<ReturnValue>(
      runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
      options?: RunOptions,
    ): StatefulPromise<ReturnValue> {
      return runtimeLaunch(executor, managedScope.scope, runtimeBlueprint, options).settled;
    },
    get state(): RuntimeScopeState {
      return managedScope.settled.state();
    },
  };

  async function haltScope(): Promise<void> {
    if (managedScope.settled.state() === "open") {
      executor.terminate(managedScope.scope);
    }
    await closed;
  }
}
