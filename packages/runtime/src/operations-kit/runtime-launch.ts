import type {
  ExecutionScopeRef,
  ExecutionScopeRootRef,
  Executor,
  LaunchHandle,
  LaunchResult,
  LaunchState,
} from "@khora/kernel";
import { KhoraError, ScopeTerminatedError } from "#src/errors";
import type { RuntimeBlueprint } from "#src/contracts";
import { lowerPlan } from "#src/adapter/plan-lower";

export function runtimeLaunch<Return>(
  executor: Executor,
  scope: ExecutionScopeRootRef | ExecutionScopeRef,
  runtimeBlueprint: RuntimeBlueprint<Return>,
  options?: RunOptions,
): RuntimeLaunchResult<Return> {
  const signal = options?.signal;

  function* wrappedRuntimeBlueprint(): ReturnType<RuntimeBlueprint<Return>> {
    if (!signal) {
      return yield* runtimeBlueprint();
    }

    function onAbort(): void {
      if (execution.state() === "open") {
        executor.terminate(execution.ref);
      }
    }

    if (signal.aborted) {
      onAbort();
    }

    signal.addEventListener("abort", onAbort, { once: true });
    try {
      return yield* runtimeBlueprint();
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }

  const execution = executor.launch(scope, () => lowerPlan(wrappedRuntimeBlueprint()));
  const settled = asSettledPromise(execution);

  return {
    scope: execution.ref,
    settled: toStatefulPromise(execution, settled),
  };
}

export interface RuntimeLaunchResult<Return> {
  readonly scope: ExecutionScopeRef;
  readonly settled: StatefulPromise<Return>;
}

export interface RunOptions {
  readonly signal?: AbortSignal;
}

export interface StatefulPromise<Return> extends PromiseLike<Return> {
  state(): LaunchState;
}

function asSettledPromise<Return>(execution: LaunchHandle<Return>): Promise<Return> {
  return new Promise<Return>((resolve, reject) => {
    execution.result.onResult((result: LaunchResult<Return>) => {
      switch (result.kind) {
        case "success":
          resolve(result.value);
          break;
        case "failure":
          reject(new KhoraError(result.reason));
          break;
        case "terminated":
          reject(new ScopeTerminatedError());
          break;
      }
    });
  });
}

function toStatefulPromise<Return>(
  execution: LaunchHandle<Return>,
  settled: Promise<Return>,
): StatefulPromise<Return> {
  return {
    state(): LaunchState {
      return execution.state();
    },
    then<TResult1 = Return, TResult2 = never>(
      onfulfilled?: ((value: Return) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2> {
      return settled.then(onfulfilled, onrejected);
    },
  };
}
