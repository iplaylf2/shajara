import type {
  ExecutionScopeRef,
  LaunchHandle,
  LaunchResult,
  LaunchStatus,
  Ritual,
} from "@shajara/kernel";
import { decodeRitual, fromFailure } from "#/boundary";
import { CanceledError } from "#/errors";
import type { Option } from "@shajara/kernel/utils";
import type { RiteRoutine } from "#/contracts";
import { isNone } from "@shajara/kernel/utils";

export class RuntimeLaunch<Result> {
  public static create<Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: RiteRoutine<Result>,
    services: RuntimeLaunchServices,
    options?: RunOptions,
  ): RuntimeLaunch<Result> {
    const signal = options?.signal;

    const execution = unwrap(
      services.launchInScope(
        scope,
        decodeRitual(function* guardedRitual(): ReturnType<RiteRoutine<Result>> {
          if (!signal) {
            return yield* ritual();
          }

          function onAbort(): void {
            if (execution.status === "open") {
              services.cancelScope(execution.scope);
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

    return new RuntimeLaunch(execution);
  }

  public get settled(): StatefulPromise<Result> {
    return this.#settled;
  }

  public get scope(): ExecutionScopeRef<Result> {
    return this.execution.scope;
  }

  private constructor(private readonly execution: LaunchHandle<Result>) {
    this.#settled = createSettledPromise(execution);
  }

  readonly #settled: StatefulPromise<Result>;
}

export interface RunOptions {
  readonly signal?: AbortSignal;
}

export interface StatefulPromise<Return> extends Promise<Return> {
  readonly status: LaunchStatus;
}

export interface RuntimeLaunchServices {
  cancelScope(scope: ExecutionScopeRef<unknown>): void;
  launchInScope<Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: Ritual<Result>,
  ): Option<LaunchHandle<Result>>;
}

function unwrap<Return>(execution: Option<LaunchHandle<Return>>): LaunchHandle<Return> {
  if (isNone(execution)) {
    throw new Error("Cannot launch ritual with an illegal scope.");
  }

  return execution.value;
}

function createSettledPromise<Return>(execution: LaunchHandle<Return>): StatefulPromise<Return> {
  const settled = new Promise<Return>((resolve, reject) => {
    execution.onSettled((result: LaunchResult<Return>) => {
      switch (result.kind) {
        case "success": {
          resolve(result.result);
          break;
        }
        case "failure": {
          reject(fromFailure(result.failure));
          break;
        }
        case "canceled": {
          reject(new CanceledError());
          break;
        }
      }
    });
  });

  return Object.defineProperty(settled, "status", {
    configurable: true,
    enumerable: true,
    get(): LaunchStatus {
      return execution.status;
    },
  }) as StatefulPromise<Return>;
}
