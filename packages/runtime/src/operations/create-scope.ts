import type { RuntimeBlueprint } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { executionAsPromise } from "#src/operations-kit/execution-as-promise";
import { suspend as kernelSuspend } from "@khora/kernel/primitives";
import { lowerPlan } from "#src/adapter/plan-lower";

export interface RuntimeScope {
  run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue>;
  halt(): Promise<void>;
  readonly state: RuntimeScopeState;
  readonly closed: Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type RuntimeScopeState = "open" | "closing" | "closed";

export function createScope(): RuntimeScope {
  const executor = ensureExecutor();
  const scope = executor.launch(executor.rootScope, () => kernelSuspend());
  const closed: Promise<void> = executionAsPromise(scope);

  return {
    [Symbol.asyncDispose](): Promise<void> {
      return haltScope();
    },
    closed,
    halt: haltScope,
    run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue> {
      return executionAsPromise(executor.launch(scope.ref, () => lowerPlan(runtimeBlueprint())));
    },
    get state(): RuntimeScopeState {
      return scope.state();
    },
  };

  async function haltScope(): Promise<void> {
    if (scope.state() === "open") {
      executor.terminate(scope.ref);
    }
    await closed;
  }
}
