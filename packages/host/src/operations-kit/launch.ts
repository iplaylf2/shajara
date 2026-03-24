import type {
  ExecutionScopeRef,
  Executor,
  LaunchHandle,
  LaunchResult,
  LaunchState,
} from "@shajara/kernel";
import { decodeRitual, fromFailure } from "#/boundary";
import { CanceledError } from "#/errors";
import type { RiteRoutine } from "#/contracts";

export function launch<Return>(
  executor: Executor,
  scope: ExecutionScopeRef,
  ritual: RiteRoutine<Return>,
  options?: RunOptions,
): HostLaunchResult<Return> {
  const signal = options?.signal;

  function* guardedRitual(): ReturnType<RiteRoutine<Return>> {
    if (!signal) {
      return yield* ritual();
    }

    function onAbort(): void {
      if (execution.state() === "open") {
        executor.cancel(execution.scope);
      }
    }

    if (signal.aborted) {
      onAbort();
    }

    signal.addEventListener("abort", onAbort, { once: true });
    try {
      return yield* ritual();
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }

  const execution = executor.launch(scope, decodeRitual(guardedRitual));
  const settled = asSettledPromise(execution);

  return {
    scope: execution.scope,
    settled: toStatefulPromise(execution, settled),
  };
}

export interface HostLaunchResult<Return> {
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
    execution.onSettled((result: LaunchResult<Return>) => {
      switch (result.kind) {
        case "success":
          resolve(result.value);
          break;
        case "failure":
          reject(fromFailure(result.reason));
          break;
        case "canceled":
          reject(new CanceledError());
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
    then: settled.then.bind(settled),
  };
}
