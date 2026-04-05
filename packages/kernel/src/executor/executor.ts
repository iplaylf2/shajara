import type { FutureResult, FutureSettleKey, Ritual, ScopeRef } from "#/contracts";
import { cancel, park, settle } from "#/primitives";
import { DomainInterpreter } from "./domain-interpreter";
import type { ExecutionScopeRef } from "./execution-scope";
import { ExecutorDriver } from "./executor-driver";
import type { LaunchHandle } from "./launch-handle";
import type { Option } from "#/utils";
import type { Pacer } from "./pacer";
import type { ProcessStepOf } from "#/interpreter";
import { RuntimeLaunchHandle } from "./launch-handle";
import { branch } from "#/sigils";
import type { either } from "fp-ts";
import { option } from "fp-ts";
import { pipe } from "fp-ts/function";
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
    this.#driver = ExecutorDriver.create(
      pacer,
      (process) => this.#interpreter.step(process),
      () => this.#startReaperRound(),
    );
    this.#interpreter = new DomainInterpreter(park, {
      reaper: { reap: () => wisp.of(option.none) },
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

    const process = this.#interpreter.spawn(scope, createLaunchWorker(ritual));
    const launchStep = this.#driver.driveSync(process) as ProcessStepOf<ScopeRef<Result>, "exited">;
    const launchedScope = (launchStep.result as either.Right<ScopeRef<Result>>).right;
    const executionScope = this.#registerScope(launchedScope);

    return option.some(
      new RuntimeLaunchHandle(
        executionScope,
        (future, onSettled) => this.#interpreter.wait(future, onSettled),
        (scopeRef) => this.#scopeStatus(scopeRef),
      ),
    );
  }

  public settle<Result>(
    futureSettle: FutureSettleKey<Result>,
    result: FutureResult<Result>,
  ): boolean {
    if (option.isSome(this.#pollFuture(futureSettle))) {
      return false;
    }

    const process = this.#interpreter.spawn(this.rootScope, () => settle(futureSettle, result));
    this.#driver.driveSync(process);
    return true;
  }

  public cancel(scope: ExecutionScopeRef<unknown>): boolean {
    if (!this.#isOpenScope(scope)) {
      return false;
    }

    const process = this.#interpreter.spawn(scope, cancel);
    this.#driver.driveSync(process);
    return true;
  }

  public get rootScope(): ExecutionScopeRef<unknown> {
    return this.#rootScope;
  }

  #isOpenScope(scope: ExecutionScopeRef<unknown>): boolean {
    return this.#isRegisteredScope(scope) && this.#scopeStatus(scope) === "open";
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

  #startReaperRound(): void {
    for (const task of this.#interpreter.reaperTasks()) {
      task();
    }
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
