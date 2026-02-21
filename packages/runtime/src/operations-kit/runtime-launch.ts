import type {
  Executor,
  LaunchHandle,
  LaunchRef,
  LaunchResult,
  LaunchState,
  RootScopeRef,
} from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";
import { RuntimeScopeFailedError } from "#src/errors/runtime-scope-failed";
import { RuntimeScopeInterruptedError } from "#src/errors/runtime-scope-interrupted";
import { lowerPlan } from "#src/adapter/plan-lower";

export interface RunOptions {
  readonly signal?: AbortSignal;
}

export interface StatefulPromise<ReturnValue> extends PromiseLike<ReturnValue> {
  state(): LaunchState;
}

export interface RuntimeLaunchResult<ReturnValue> {
  readonly scope: LaunchRef;
  readonly settled: StatefulPromise<ReturnValue>;
}

function asSettledPromise<ReturnValue>(execution: LaunchHandle<ReturnValue>): Promise<ReturnValue> {
  return new Promise<ReturnValue>((resolve, reject) => {
    execution.result.onResult((result: LaunchResult<ReturnValue>) => {
      switch (result.kind) {
        case "success":
          resolve(result.value);
          break;
        case "failure":
          reject(new RuntimeScopeFailedError(result.reason));
          break;
        case "interruption":
          reject(new RuntimeScopeInterruptedError());
          break;
      }
    });
  });
}

function toStatefulPromise<ReturnValue>(
  execution: LaunchHandle<ReturnValue>,
  settled: Promise<ReturnValue>,
): StatefulPromise<ReturnValue> {
  return {
    state(): LaunchState {
      return execution.state();
    },
    then<TResult1 = ReturnValue, TResult2 = never>(
      onfulfilled?: ((value: ReturnValue) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2> {
      return settled.then(onfulfilled, onrejected);
    },
  };
}

export function runtimeLaunch<ReturnValue>(
  executor: Executor,
  scope: RootScopeRef | LaunchRef,
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
  options?: RunOptions,
): RuntimeLaunchResult<ReturnValue> {
  const signal = options?.signal;

  function* wrappedRuntimeBlueprint(): ReturnType<RuntimeBlueprint<ReturnValue>> {
    if (!signal) {
      return yield* runtimeBlueprint();
    }

    const onAbort = (): void => {
      if (execution.state() === "open") {
        executor.terminate(execution.ref);
      }
    };

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
