// oxlint-disable max-dependencies
import type { Disposer, Option } from "#/utils/index";
import type { FailureShape, FutureResult, FutureSettleKey, Ritual, ScopeRef } from "#/contracts";
import type { LaunchHandle, LaunchResult, LaunchStatus } from "./launch-handle";
import { canceledFailure, interruptedFailure } from "#/failures";
import { either, io, option } from "fp-ts";
import { halt, park } from "#/primitives/index";
import { noop, unreachable } from "#/utils/index";
import { DomainInterpreter } from "./domain-interpreter";
import type { ExecutionScopeRef } from "./execution-scope";
import { ExecutorDriver } from "./executor-driver";
import type { Failure } from "#/failures";
import { FaultSink } from "./fault-sink";
import type { Pacer } from "./pacer";
import type { ProcessStepOf } from "#/interpreter/index";
import { RoundLimitReaper } from "./round-limit-reaper";
import { RuntimeLaunchHandle } from "./launch-handle";
import { branch } from "#/sigils/index";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

export type BindTurn = (flushTurn: () => void) => Pacer;

export function createExecutor(bindTurn: BindTurn): Executor {
  return new RuntimeExecutor(bindTurn);
}

export interface Executor extends LaunchHandle<never> {
  launch<Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: Ritual<Result>,
  ): Option<LaunchHandle<Result>>;
  settle<Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>): boolean;
  cancel(scope: ExecutionScopeRef<unknown>): void;
}

class RuntimeExecutor implements Executor {
  public constructor(bindTurn: BindTurn) {
    const pacer = bindTurn(() => {
      this.#startReaperRound();
    });
    this.#driver = new ExecutorDriver(pacer, (process) =>
      this.#interpreter.step(process, { capture: unreachable }),
    );
    this.#interpreter = DomainInterpreter.createByAutonomy(park, {
      reaper: new RoundLimitReaper(DEFAULT_REAPER_ROUND_LIMIT),
      scheduler: { assign: () => this.#driver.processor },
    });
    this.#rootScope = this.#registerScope(this.#interpreter.scopeRoot as never);
    this.#interpreter.onSettled(this.#rootScope.exitFuture, () => {
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

    using fault = new FaultSink("Out-of-band failures occurred while spawning a launched scope");
    const process = this.#interpreter.spawn(
      scope,
      createLaunchWorker(ritual),
      { completionMode: "structural" },
      fault,
    );
    const cause = fault.drain();
    if (option.isSome(cause)) {
      this.#interruptScope(scope, cause.value);

      return option.none;
    }

    const launchStep = this.#driver.driveSyncUnsafely(process) as ProcessStepOf<
      ScopeRef<Result>,
      "exited"
    >;
    const launchedScope = (launchStep.result as either.Right<ScopeRef<Result>>).right;
    const executionScope = this.#registerScope(launchedScope);

    return option.some(
      new RuntimeLaunchHandle(executionScope, {
        onSettled: (id, onSettled) => this.#onSettled(id, onSettled),
        status: (id) => this.#status(id),
      }),
    );
  }

  public settle<Result>(
    futureSettle: FutureSettleKey<Result>,
    result: FutureResult<Result>,
  ): boolean {
    using fault = new FaultSink("Out-of-band failures occurred while settling a future");
    return this.#interpreter.settle(futureSettle, result, fault);
  }

  public cancel(scope: ExecutionScopeRef<unknown>): void {
    if (!this.#isOpenScope(scope)) {
      return;
    }

    using fault = new FaultSink("Out-of-band failures occurred while canceling a scope");
    this.#interpreter.cancel(scope, fault);
  }

  public onSettled(listener: (result: LaunchResult<never>) => void): Disposer {
    return this.#onSettled(this.#rootScope, listener);
  }

  public get scope(): ExecutionScopeRef<never> {
    return this.#rootScope;
  }

  public get status(): LaunchStatus {
    return this.#status(this.#rootScope);
  }

  #startReaperRound(): void {
    using faultSink = new FaultSink("Out-of-band failures occurred while starting a reaper round");
    for (const [scope, process] of this.#interpreter.startReaperTasks(faultSink)) {
      this.#interpreter.onSettled(process.exitFuture, (result, suppressor) => {
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
            this.#interpreter.spawn(
              scope,
              () => halt(failure),
              { completionMode: "structural" },
              suppressor,
            );
          }),
          (run) => run(),
        );
      });
    }
  }

  #isOpenScope(scope: ExecutionScopeRef<unknown>): boolean {
    return this.#isRegisteredScope(scope) && this.#interpreter.scopeState(scope).status === "open";
  }

  #interruptScope(scope: ExecutionScopeRef<unknown>, cause: unknown): void {
    using faultSink = new FaultSink("Out-of-band failures occurred while force failing a scope");
    this.#interpreter.forceFailed(scope, interruptedFailure(cause), faultSink);
  }

  #onSettled<Result>(
    scope: ScopeRef<Result>,
    listener: (result: LaunchResult<Result>) => void,
  ): Disposer {
    const settled = this.#interpreter.poll(scope.exitFuture);
    if (option.isSome(settled)) {
      listener(toLaunchResult(settled.value));

      return noop;
    }

    return this.#interpreter.onSettled(scope.exitFuture, (result, suppressor) => {
      try {
        listener(toLaunchResult(result));
      } catch (error) {
        suppressor.capture(error);
      }
    });
  }

  #status(scope: ScopeRef<unknown>) {
    return this.#interpreter.scopeState(scope).status;
  }

  #registerScope<Result>(scope: ScopeRef<Result>): ExecutionScopeRef<Result> {
    this.#scopeRegistry.add(scope);
    return scope as ExecutionScopeRef<Result>;
  }

  #isRegisteredScope(scope: ScopeRef<unknown>): boolean {
    return this.#scopeRegistry.has(scope);
  }

  readonly #driver: ExecutorDriver;
  readonly #interpreter: DomainInterpreter;
  readonly #rootScope: ExecutionScopeRef<never>;
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

function toLaunchResult<Result>(result: FutureResult<Result>): LaunchResult<Result> {
  if (either.isLeft(result)) {
    if (result.left === canceledFailure) {
      return { kind: "canceled" };
    }

    return { failure: result.left as Failure, kind: "failure" };
  }
  return { kind: "success", result: result.right };
}

const DEFAULT_REAPER_ROUND_LIMIT = 2;
