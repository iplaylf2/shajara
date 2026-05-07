import type { ChannelEndpoint, ChannelSender, SendResult } from "#/sigils/index";
import type { Disposer, Option } from "#/utils/index";
import type { FutureKey, FutureResult, FutureSettleKey, Ritual, ScopeRef } from "#/contracts";
import type { LaunchHandle, LaunchStatus } from "./launch-handle";
import { either, option } from "fp-ts";
import { halt, park } from "#/primitives/index";
import { DomainInterpreter } from "./domain-interpreter";
import type { ExecutionScopeRef } from "./execution-scope";
import { ExecutorDriver } from "./executor-driver";
import { FaultSink } from "./fault-sink";
import type { Pacer } from "./pacer";
import { RoundLimitReaper } from "./round-limit-reaper";
import { noop } from "#/utils/index";
import { withRecoveryAnchor } from "#/primitives-kit";

export type BindTurn = (flushTurn: () => void) => Pacer;

export function createExecutor(bindTurn: BindTurn): Executor {
  return new RuntimeExecutor(bindTurn);
}

export interface Executor extends LaunchHandle<never> {
  launch<Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: Ritual<Result>,
  ): Option<LaunchHandle<Result>>;
  onSettled<Result>(
    future: FutureKey<Result>,
    listener: (result: FutureResult<Result>) => void,
  ): Disposer;
  settle<Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>): boolean;
  trySend<Value, Outcome>(
    sender: ChannelSender<Value, Outcome>,
    value: Value,
  ): Option<SendResult<Outcome>>;
  close<Outcome>(endpoint: ChannelEndpoint<unknown, Outcome>, outcome: Outcome): void;
  cancel(scope: ExecutionScopeRef<unknown>): void;
}

class RuntimeExecutor implements Executor {
  public constructor(bindTurn: BindTurn) {
    const pacer = bindTurn(() => {
      this.#startReaperRound();
    });
    this.#driver = new ExecutorDriver(pacer);
    this.#interpreter = DomainInterpreter.createByAutonomy(withRecoveryAnchor(park), {
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

    using fault = new FaultSink("Out-of-band failures occurred while branching a launched scope");
    const launched = this.#interpreter.branch(scope, ritual, {}, fault);
    const branchFault = fault.drain();
    if (option.isSome(branchFault)) {
      this.#interpreter.cancel(scope, fault);

      return option.none;
    }

    const executionScope = this.#registerScope(launched.scope);

    return option.some(this.#createLaunchHandle(executionScope));
  }

  public onSettled<Result>(
    future: FutureKey<Result>,
    listener: (result: FutureResult<Result>) => void,
  ): Disposer {
    const settled = this.#interpreter.poll(future);
    if (option.isSome(settled)) {
      listener(settled.value);

      return noop;
    }

    return this.#interpreter.onSettled(future, (result, suppressor) => {
      try {
        listener(result);
      } catch (error) {
        suppressor.capture(error);
      }
    });
  }

  public settle<Result>(
    futureSettle: FutureSettleKey<Result>,
    result: FutureResult<Result>,
  ): boolean {
    using fault = new FaultSink("Out-of-band failures occurred while settling a future");
    return this.#interpreter.settle(futureSettle, result, fault);
  }

  public trySend<Value, Outcome>(
    sender: ChannelSender<Value, Outcome>,
    value: Value,
  ): Option<SendResult<Outcome>> {
    using fault = new FaultSink("Out-of-band failures occurred while sending to a channel");
    return this.#interpreter.trySend(sender, value, fault);
  }

  public close<Outcome>(endpoint: ChannelEndpoint<unknown, Outcome>, outcome: Outcome): void {
    using fault = new FaultSink("Out-of-band failures occurred while closing a channel");
    this.#interpreter.close(endpoint, outcome, fault);
  }

  public cancel(scope: ExecutionScopeRef<unknown>): void {
    if (!this.#isRegisteredScope(scope)) {
      return;
    }

    using fault = new FaultSink("Out-of-band failures occurred while canceling a scope");
    this.#interpreter.cancel(scope, fault);
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

        const failure = either.isLeft(result) ? option.some(result.left) : result.right;
        if (option.isNone(failure)) {
          return;
        }

        this.#interpreter.spawn(
          scope,
          () => halt(failure.value),
          { completionMode: "structural" },
          suppressor,
        );
      });
    }
  }

  #isOpenScope(scope: ExecutionScopeRef<unknown>): boolean {
    return this.#isRegisteredScope(scope) && this.#interpreter.scopeState(scope).status === "open";
  }

  #status(scope: ScopeRef<unknown>) {
    return this.#interpreter.scopeState(scope).status;
  }

  #createLaunchHandle<Result>(scope: ExecutionScopeRef<Result>): LaunchHandle<Result> {
    const readStatus = () => this.#status(scope);

    return {
      scope,
      get status(): LaunchStatus {
        return readStatus();
      },
    };
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

const DEFAULT_REAPER_ROUND_LIMIT = 2;
