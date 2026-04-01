import type {
  ExecutionScopeRef,
  Executor,
  LaunchHandle,
  LaunchResult,
  LaunchStatus,
} from "@shajara/kernel";
import { decodeRitual, fromFailure } from "#/boundary";
import { CanceledError } from "#/errors";
import type { RiteRoutine } from "#/contracts";

export function launch<Result>(
  executor: Executor,
  scope: ExecutionScopeRef<unknown>,
  ritual: RiteRoutine<Result>,
  options?: RunOptions,
): HostLaunchResult<Result> {
  const signal = options?.signal;

  function* guardedRitual(): ReturnType<RiteRoutine<Result>> {
    if (!signal) {
      return yield* ritual();
    }

    function onAbort(): void {
      if (execution.status === "open") {
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

export interface HostLaunchResult<Result> {
  readonly scope: ExecutionScopeRef<Result>;
  readonly settled: StatefulPromise<Result>;
}

export interface RunOptions {
  readonly signal?: AbortSignal;
}

export interface StatefulPromise<Return> extends PromiseLike<Return> {
  status: LaunchStatus;
}

function asSettledPromise<Return>(execution: LaunchHandle<Return>): Promise<Return> {
  return new Promise<Return>((resolve, reject) => {
    execution.onSettled((result: LaunchResult<Return>) => {
      switch (result.kind) {
        case "success":
          resolve(result.result);
          break;
        case "failure":
          reject(fromFailure(result.failure));
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
    get status(): LaunchStatus {
      return execution.status;
    },
    then: settled.then.bind(settled),
  };
}
