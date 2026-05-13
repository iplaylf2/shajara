import type { ExecutionScopeRef, Executor, LaunchHandle, LaunchStatus } from "@shajara/kernel";
import { decodeRitual, fromFailure } from "#/boundary/index";
import { isLeft, isNone } from "@shajara/kernel/utils";
import type { Option } from "@shajara/kernel/utils";
import type { RiteRoutine } from "#/contracts";

export function launchEntry<Result>(
  executor: Executor,
  scope: ExecutionScopeRef<unknown>,
  ritual: RiteRoutine<Result>,
  options?: RunOptions,
): LaunchedEntry<Result> {
  const signal = options?.signal;

  const handle = requireLaunch(
    executor.launch(
      scope,
      decodeRitual(function* guardedRitual(): ReturnType<RiteRoutine<Result>> {
        if (!signal) {
          return yield* ritual();
        }

        function onAbort(): void {
          if (handle.status === "open") {
            executor.cancel(handle.scope);
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
      }),
    ),
  );

  return {
    scope: handle.scope,
    settled: createStatefulPromise(handle, executor),
  };
}

export interface LaunchedEntry<Result> {
  /** Scope that owns the launched routine. */
  readonly scope: ExecutionScopeRef<Result>;
  /** Promise for observing the launched routine result. */
  readonly settled: StatefulPromise<Result>;
}

/** Options accepted by `run` and `Scope.run`. */
export interface RunOptions {
  /** Abort signal that requests cancellation for the launched scope. */
  readonly signal?: AbortSignal;
}

/** Promise for a launched routine with live lifecycle state. */
export interface StatefulPromise<Return> extends Promise<Return> {
  /** Current lifecycle state for the launched routine. */
  readonly status: LaunchStatus;
}

function requireLaunch<Return>(handle: Option<LaunchHandle<Return>>): LaunchHandle<Return> {
  if (isNone(handle)) {
    throw new Error("Cannot launch ritual with an illegal scope.");
  }

  return handle.value;
}

function createStatefulPromise<Return>(
  handle: LaunchHandle<Return>,
  executor: Executor,
): StatefulPromise<Return> {
  const settled = new Promise<Return>((resolve, reject) => {
    executor.onSettled(handle.scope.exitFuture, (result) => {
      if (isLeft(result)) {
        reject(fromFailure(result.left));
        return;
      }

      resolve(result.right);
    });
  });

  return Object.defineProperty(settled, "status", {
    configurable: true,
    enumerable: true,
    get(): LaunchStatus {
      return handle.status;
    },
  }) as StatefulPromise<Return>;
}
