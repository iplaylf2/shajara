import type { ExecutionScopeRef, Executor, LaunchHandle, LaunchStatus } from "@shajara/kernel";
import { decodeRitual, fromFailure, toFailureUnknown } from "#/boundary/index.js";
import { isLeft, isNone } from "@shajara/kernel/utils";
import { CanceledError } from "#/errors/index.js";
import type { Option } from "@shajara/kernel/utils";
import type { RiteRoutine } from "#/contracts/index.js";

export function launchEntry<Result>(
  executor: Executor,
  scope: ExecutionScopeRef<unknown>,
  routine: RiteRoutine<Result>,
  options?: RunOptions,
): LaunchedEntry<Result> {
  const signal = options?.signal;

  const handle = requireLaunch(
    executor.launch(
      scope,
      decodeRitual(function* guardedRoutine(): ReturnType<RiteRoutine<Result>> {
        if (!signal) {
          return yield* routine();
        }

        const abortSignal = signal;

        function onAbort(): void {
          if (handle.status !== "open") {
            return;
          }

          const { reason } = abortSignal;
          if (
            reason === null ||
            reason instanceof CanceledError ||
            (reason instanceof globalThis.DOMException && reason.name === "AbortError")
          ) {
            executor.cancel(handle.scope);
            return;
          }

          executor.halt(handle.scope, toFailureUnknown(reason));
        }

        if (abortSignal.aborted) {
          onAbort();
        }

        abortSignal.addEventListener("abort", onAbort, { once: true });
        try {
          return yield* routine();
        } finally {
          abortSignal.removeEventListener("abort", onAbort);
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
  /** Promise for the launched routine result. */
  readonly settled: StatefulPromise<Result>;
}

/** Options accepted by `run` and `Scope.run`. */
export interface RunOptions {
  /**
   * Abort signal linked to the launched routine.
   * Abort reasons that represent cancellation cancel the routine; other reasons fail it.
   */
  readonly signal?: AbortSignal;
}

/** Promise for a launched routine with live lifecycle state. */
export interface StatefulPromise<Return> extends Promise<Return> {
  /** Current lifecycle state for the launched routine. */
  readonly status: LaunchStatus;
}

function requireLaunch<Return>(handle: Option<LaunchHandle<Return>>): LaunchHandle<Return> {
  if (isNone(handle)) {
    throw new Error("Cannot launch routine with an illegal scope.");
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
