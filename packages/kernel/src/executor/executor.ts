import type { ChannelEndpoint, ChannelSender, SendResult } from "#/sigils/index.js";
import type {
  ContextKey,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  Ritual,
  ScopeRef,
  Suppressor,
} from "#/contracts/index.js";
import type { Disposer, Option } from "#/utils/index.js";
import type { LaunchHandle, LaunchStatus } from "./launch-handle.js";
import { either, option } from "fp-ts";
import { halt, park } from "#/primitives/index.js";
import { DomainInterpreter } from "./domain-interpreter.js";
import type { ExecutionScopeRef } from "./execution-scope.js";
import { ExecutorDriver } from "./executor-driver.js";
import type { Failure } from "#/failures/index.js";
import { FaultSink } from "./fault-sink.js";
import type { Pacer } from "./pacer.js";
import { RoundLimitReaper } from "./round-limit-reaper.js";
import { contextKey } from "#/contracts/index.js";
import { noop } from "#/utils/index.js";
import { withRecoveryAnchor } from "#/primitives-kit/index.js";

/**
 * Attaches executor turn requests to the embedding environment.
 *
 * @param flushTurn - Callback the embedding environment must invoke to progress queued work.
 * @returns Pacer for slice control and continuation scheduling.
 */
export type BindTurn = (flushTurn: () => void) => Pacer;

/**
 * Creates a long-lived executor with a root scope.
 *
 * @returns Executor handle for the root scope.
 */
export function createExecutor(bindTurn: BindTurn): Executor {
  return new RuntimeExecutor(bindTurn);
}

/** Execution environment that launches entries and exposes external observation and control. */
export interface Executor extends LaunchHandle<never> {
  /**
   * Launches an entry as a child of a registered open execution scope.
   *
   * @returns Launch handle for the new entry, or `none` when the target scope cannot accept it.
   */
  launch: <Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: Ritual<Result>,
  ) => Option<LaunchHandle<Result>>;

  /**
   * Subscribes to one future settlement.
   *
   * @param listener - Called once with the settled in-band future result; already-settled
   * futures notify synchronously.
   * @returns Disposer that removes a pending listener before settlement.
   */
  onSettled: <Result>(
    future: FutureKey<Result>,
    listener: (result: FutureResult<Result>) => void,
  ) => Disposer;

  /**
   * Attempts to settle a future through its settlement authority from outside computation code.
   *
   * @returns `true` when the settlement is accepted, or `false` after prior convergence.
   */
  settle: <Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>) => boolean;

  /**
   * Attempts one channel send through a sender endpoint without blocking the caller.
   *
   * @returns Immediate send result, or `none` when the send would block.
   */
  trySend: <Value, Outcome>(
    sender: ChannelSender<Value, Outcome>,
    value: Value,
  ) => Option<SendResult<Outcome>>;

  /** Closes a channel through either endpoint and wakes blocked channel operations. */
  close: <Outcome>(endpoint: ChannelEndpoint<unknown, Outcome>, outcome: Outcome) => void;

  /** Requests cancellation for a registered execution scope; unknown scopes are ignored. */
  cancel: (scope: ExecutionScopeRef<unknown>) => void;

  /**
   * Halts a registered open execution scope with an in-band failure.
   * Unknown, closing, or closed scopes are ignored.
   */
  halt: (scope: ExecutionScopeRef<unknown>, failure: Failure) => void;
}

/** Context key for accessing the current executor from launched work. */
export const currentExecutorKey: ContextKey<Executor> = contextKey<Executor>();

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
    this.#interpreter.bind(this.#rootScope, currentExecutorKey, this);
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
    return this.#observeSettled(
      future,
      (result, suppressor) => {
        try {
          listener(result);
        } catch (error) {
          suppressor.capture(error);
        }
      },
      {
        capture: (error) => {
          throw error;
        },
      },
    );
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

  public halt(scope: ExecutionScopeRef<unknown>, failure: Failure): void {
    if (!this.#isOpenScope(scope)) {
      return;
    }

    using fault = new FaultSink("Out-of-band failures occurred while halting a scope");
    this.#interpreter.spawn(scope, () => halt(failure), { completionMode: "structural" }, fault);
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
      this.#observeSettled(
        process.exitFuture,
        (result, suppressor) => {
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
        },
        faultSink,
      );
    }
  }

  #observeSettled<Result>(
    future: FutureKey<Result>,
    listener: (result: FutureResult<Result>, suppressor: Suppressor) => void,
    suppressor: Suppressor,
  ): Disposer {
    const settled = this.#interpreter.poll(future);
    if (option.isSome(settled)) {
      listener(settled.value, suppressor);

      return noop;
    }

    return this.#interpreter.onSettled(future, listener);
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

// Reaper rounds are adjudication opportunities, not clock ticks.
// Keep the default finite, but broad enough for multi-wave cleanup convergence.
const DEFAULT_REAPER_ROUND_LIMIT = 32;
