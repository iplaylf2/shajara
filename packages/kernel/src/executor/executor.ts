import type {
  FailureShape,
  FutureResult,
  FutureSettleKey,
  Ritual,
  ScopeRef,
  Suppressor,
} from "#/contracts";
import { cancel, park, settle } from "#/primitives";
import { either, io, option } from "fp-ts";
import { DomainInterpreter } from "./domain-interpreter";
import type { ExecutionScopeRef } from "./execution-scope";
import { ExecutorDriver } from "./executor-driver";
import type { Failure } from "#/failures";
import { FaultSink } from "./fault-sink";
import type { LaunchHandle } from "./launch-handle";
import type { Option } from "#/utils";
import type { Pacer } from "./pacer";
import type { ProcessStepOf } from "#/interpreter";
import { RuntimeLaunchHandle } from "./launch-handle";
import { branch } from "#/sigils";
import { pipe } from "fp-ts/function";
import { unreachable } from "#/utils";
import { wisp } from "#/internal/fp";

export function createExecutor(pacer: Pacer): Executor {
  return new RuntimeExecutor(pacer);
}

export interface Executor {
  readonly rootScope: ExecutionScopeRef<unknown>;
  launch<Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: Ritual<Result>,
  ): Option<LaunchHandle<Result>>;
  settle<Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>): boolean;
  cancel(scope: ExecutionScopeRef<unknown>): boolean;
}

class RuntimeExecutor implements Executor {
  public constructor(pacer: Pacer) {
    this.#driver = ExecutorDriver.create(pacer, {
      beginTurn: () => this.#startReaperRound(),
      stepProcess: (process) => this.#interpreter.step(process, { capture: unreachable }),
    });
    this.#interpreter = new DomainInterpreter(park, {
      reaper: { adjudicate: () => wisp.of(option.none) },
      scheduler: { assign: () => this.#driver.processor },
    });
    this.#rootScope = this.#registerScope(this.#interpreter.scopeRoot);
    this.#interpreter.wait(this.#rootScope.exitFuture, () => {
      this.#driver.stop();
    });
  }

  public launch<Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: Ritual<Result>,
  ): Option<LaunchHandle<Result>> {
    if (!this.#isOpenScope(scope)) {
      return option.none;
    }

    const process = this.#interpreter.spawn(scope, createLaunchWorker(ritual), {
      capture: unreachable,
    });
    const launchStep = this.#driver.driveSyncUnsafely(process) as ProcessStepOf<
      ScopeRef<Result>,
      "exited"
    >;
    const launchedScope = (launchStep.result as either.Right<ScopeRef<Result>>).right;
    const executionScope = this.#registerScope(launchedScope);

    return option.some(
      new RuntimeLaunchHandle(executionScope, {
        onSettled: (onSettled) => this.#onScopeSettled(executionScope, onSettled),
        status: () => this.#scopeStatus(executionScope),
      }),
    );
  }

  public settle<Result>(
    futureSettle: FutureSettleKey<Result>,
    result: FutureResult<Result>,
  ): boolean {
    if (option.isSome(this.#pollFuture(futureSettle))) {
      return false;
    }

    const process = this.#interpreter.spawn(this.rootScope, () => settle(futureSettle, result), {
      capture: unreachable,
    });
    this.#driver.driveSyncUnsafely(process);
    return true;
  }

  public cancel(scope: ExecutionScopeRef<unknown>): boolean {
    if (!this.#isOpenScope(scope)) {
      return false;
    }

    const process = this.#interpreter.spawn(scope, cancel, { capture: unreachable });
    this.#driver.driveSyncUnsafely(process);
    return true;
  }

  public get rootScope(): ExecutionScopeRef<unknown> {
    return this.#rootScope;
  }

  #startReaperRound(): void {
    const faultSink = new FaultSink();
    for (const [scope, process] of this.#interpreter.startReaperTasks(faultSink)) {
      this.#interpreter.wait(process.exitFuture, (result, suppressor) => {
        if (this.#interpreter.scopeState(scope).status === "closed") {
          return;
        }

        pipe(
          result,
          either.chain(
            option.match(
              () => either.right(io.Do),
              (id: FailureShape) => either.left(id),
            ),
          ),
          either.getOrElse((failure) => () => {
            this.#interpreter.forceFailed(scope, failure as Failure, suppressor);
          }),
          (run) => run(),
        );
      });
    }
    faultSink.throwIfAny("Out-of-band failures occurred while starting a reaper round");
  }

  #isOpenScope(scope: ExecutionScopeRef<unknown>): boolean {
    return this.#isRegisteredScope(scope) && this.#scopeStatus(scope) === "open";
  }

  #onScopeSettled<Result>(
    scope: ExecutionScopeRef<Result>,
    onSettled: (result: FutureResult<Result>, suppressor: Suppressor) => void,
  ) {
    return this.#interpreter.wait(scope.exitFuture, onSettled);
  }

  #scopeStatus(scope: ExecutionScopeRef<unknown>) {
    return this.#interpreter.scopeState(scope).status;
  }

  #registerScope<Result>(scope: ScopeRef<Result>): ExecutionScopeRef<Result> {
    this.#scopeRegistry.add(scope);
    return scope as ExecutionScopeRef<Result>;
  }

  #isRegisteredScope(scope: ScopeRef<unknown>): boolean {
    return this.#scopeRegistry.has(scope);
  }

  #pollFuture<Result>(futureSettle: FutureSettleKey<Result>): Option<FutureResult<Result>> {
    return this.#interpreter.poll(futureSettle);
  }

  readonly #driver: ExecutorDriver;
  readonly #interpreter: DomainInterpreter;
  readonly #rootScope: ExecutionScopeRef<unknown>;
  readonly #scopeRegistry = new WeakSet<ScopeRef<unknown>>();
}

function createLaunchWorker<Result>(ritual: Ritual<Result>): Ritual<ScopeRef<Result>> {
  return () =>
    pipe(
      branch(ritual, {
        failureMode: "contain",
      }),
      wisp.liftF,
      wisp.map(({ scope }) => scope),
    );
}
