// oxlint-disable max-lines
import type {
  ChannelReceiver,
  ChannelSender,
  OverloadRewrite,
  ProcessDescriptor,
  ReceiveResult,
  ScopeDescriptor,
  SelfHandle,
  SendResult,
  Sigil,
} from "#/sigils/index";
import type {
  CleanupTask,
  ProvideRuntimeProcess,
  RuntimeProcessHandle,
  RuntimeProcessKeeper,
  RuntimeProcessNextEcho,
  RuntimeProcessRunner,
} from "./runtime-process";
import type {
  ContextKey,
  Echo,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  ProcessRef,
  Ritual,
  ScopeRef,
  Suppressor,
} from "#/contracts";
import type { FutureSettler, RuntimeFuture } from "./runtime-future";
import { RuntimeScope, RuntimeScopeReconciler } from "./runtime-scope";
import { canceledFailure, interruptedFailure } from "#/failures";
import { either, option } from "fp-ts";
import {
  processCededStep,
  processExitedStep,
  processInterpretedStep,
  processResonatedStep,
  processWaitingStep,
} from "./process-step";
import type { Disposer } from "#/utils/index";
import type { Failure } from "#/failures";
import type { ProcessStep } from "./process-step";
import type { RuntimeChannelHandle } from "./runtime-channel";
import { RuntimeProcess } from "./runtime-process";
import type { ScopeSync } from "./runtime-scope";
import type { ScopeZone } from "./scope-zone";
import type { TaggedUnion } from "type-fest";
import { identity } from "fp-ts/function";
import { unreachable } from "#/utils/index";

export class Interpreter {
  public static create(entry: Ritual<unknown>, zone: ScopeZone): Interpreter {
    const interpreter = new Interpreter(entry, zone);
    interpreter.initialize();
    return interpreter;
  }

  public step<Relic>(process: ProcessRef<Relic>, suppressor: Suppressor): ProcessStep<Relic> {
    const handle = this.#resolve(process);
    const runner = handle.runner();

    switch (runner.status) {
      case "waiting": {
        return processWaitingStep();
      }
      case "completed": {
        return processExitedStep(either.right(runner.stateAs(runner.status).result));
      }
      case "canceled": {
        return processExitedStep(either.left(canceledFailure));
      }
      case "failed": {
        return processExitedStep(either.left(runner.stateAs(runner.status).failure));
      }
      case "running": {
        const running = runner.stateAs(runner.status);
        const nextResult = either.tryCatch(() => running.next(), identity);

        if (either.isLeft(nextResult)) {
          const scope = this.#resolve(handle.scopeRef);
          this.#reconcile(
            scope,
            halt(scope, handle.keeper(), interruptedFailure(nextResult.left)),
            suppressor,
          );

          return processExitedStep(either.left(runner.stateAs("failed").failure));
        }

        const next = nextResult.right;

        switch (next.kind) {
          case "echo": {
            return this.#interpret(handle, next, suppressor);
          }
          case "resonate": {
            return processResonatedStep();
          }
          case "relic": {
            const scope = this.#resolve(handle.scopeRef);
            this.#reconcile(scope, scope.complete(handle.keeper(), next.relic), suppressor);
            return processExitedStep(either.right(next.relic));
          }
        }
      }
    }
  }

  public spawn<Relic>(
    scope: ScopeRef<unknown>,
    worker: Ritual<Relic>,
    descriptor: ProcessDescriptor,
    suppressor: Suppressor,
  ): ProcessRef<Relic> {
    return this.#reconcile(
      scope,
      spawn(this.#resolve(scope), this.#provideProcess(worker), descriptor),
      suppressor,
    );
  }

  public bind<Value>(scope: ScopeRef<unknown>, contextKey: ContextKey<Value>, value: Value): void {
    bind(this.#resolve(scope), contextKey, value);
  }

  public unbind(scope: ScopeRef<unknown>, contextKey: ContextKey<unknown>): void {
    unbind(this.#resolve(scope), contextKey);
  }

  public lookup<Value>(
    scope: ScopeRef<unknown>,
    contextKey: ContextKey<Value>,
  ): option.Option<Value> {
    return lookup(this.#resolve(scope), contextKey);
  }

  public poll<Result>(
    futureKey: FutureKey<Result> | FutureSettleKey<Result>,
  ): option.Option<FutureResult<Result>> {
    return option.fromNullable(poll(this.#resolve(futureKey)));
  }

  public wait<Result>(
    futureKey: FutureKey<Result> | FutureSettleKey<Result>,
    onSettled: FutureSettler<Result>,
  ): Disposer {
    return this.#resolve(futureKey).wait(onSettled);
  }

  public settle<Result>(
    futureSettle: FutureSettleKey<Result>,
    result: FutureResult<Result>,
    suppressor: Suppressor,
  ): boolean {
    return settle(this.#resolve(futureSettle), result, suppressor);
  }

  public cancel(scope: ScopeRef<unknown>, suppressor: Suppressor): void {
    this.#reconcile(scope, cancel(this.#resolve(scope)), suppressor);
  }

  public tryReceive<Value>(
    receiver: ChannelReceiver<Value>,
    suppressor: Suppressor,
  ): option.Option<ReceiveResult<Value>> {
    const channelHandle = this.#resolve(receiver);
    const channelScope = this.#resolve(channelHandle.scope);
    const result = this.#reconcile(
      channelScope,
      tryReceive(channelScope, channelHandle),
      suppressor,
    );

    return option.fromNullable(result);
  }

  public trySend<Value>(
    sender: ChannelSender<Value>,
    value: Value,
    suppressor: Suppressor,
  ): option.Option<SendResult> {
    const channelHandle = this.#resolve(sender);
    const channelScope = this.#resolve(channelHandle.scope);
    const result = this.#reconcile(
      channelScope,
      trySend(channelScope, channelHandle, value),
      suppressor,
    );

    return option.fromNullable(result);
  }

  public close(
    endpoint: ChannelReceiver<unknown> | ChannelSender<unknown>,
    suppressor: Suppressor,
  ): void {
    const channelHandle = this.#resolve(endpoint);
    const channelScope = this.#resolve(channelHandle.scope);
    this.#reconcile(channelScope, close(channelScope, channelHandle), suppressor);
  }

  public forceFailed(scope: ScopeRef<unknown>, failure: Failure, suppressor: Suppressor): void {
    this.#reconcile(scope, this.#resolve(scope).forceFailed(failure), suppressor);
  }

  public scopeState(scope: ScopeRef<unknown>): ScopeState {
    const runtimeScope = this.#resolve(scope);
    switch (runtimeScope.status) {
      case "running": {
        return { ...scopeInfo(runtimeScope), status: "open" };
      }
      case "closing": {
        return { ...scopeInfo(runtimeScope), status: "closing" };
      }
      case "canceling": {
        return { ...scopeInfo(runtimeScope), status: "closing" };
      }
      case "failing": {
        return { ...scopeInfo(runtimeScope), status: "closing" };
      }
      case "canceled":
      case "completed":
      case "failed": {
        return { ...scopeInfo(runtimeScope), status: "closed" };
      }
    }
  }

  public processState(process: ProcessRef<unknown>): ProcessState {
    const runner = this.#resolve(process).runner();

    switch (runner.status) {
      case "running": {
        return { activity: "running", status: "open" };
      }
      case "waiting": {
        return { activity: "waiting", status: "open" };
      }
      case "completed":
      case "canceled":
      case "failed": {
        return { status: "closed" };
      }
    }
  }

  public scope(process: ProcessRef<unknown>): ScopeRef<unknown> {
    return this.#resolve(process).scopeRef;
  }

  public get scopeRoot(): ScopeRef<void> {
    return this.#scopeRoot as ScopeRef<void>;
  }

  public get processRoot(): ProcessRef<void> {
    return this.#scopeRoot.entryProcess as ProcessRef<void>;
  }

  public get isClosed(): boolean {
    return this.#scopeRoot.isClosed;
  }

  protected constructor(
    private readonly entry: Ritual<unknown>,
    private readonly zoneRoot: ScopeZone,
  ) {}

  // oxlint-disable-next-line max-params
  protected scopeBranch(
    scope: ScopeRef<unknown>,
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zone: ScopeZone,
    suppressor: Suppressor,
  ): ScopeRef<unknown> {
    const childScope = this.#reconcile(
      scope,
      branch(this.#resolve(scope), this.#provideProcess(entry), descriptor, zone),
      suppressor,
    );
    this.#touch(childScope);
    return childScope;
  }

  protected initialize(): void {
    // oxlint-disable-next-line no-explicit-any
    (this as any).#scopeRoot = this.#reconcile(
      null as unknown as ScopeRef<unknown>,
      RuntimeScope.root(
        this.#provideProcess(this.entry),
        { failureMode: "contain" },
        this.zoneRoot,
      ),
      { capture: unreachable },
    );

    this.#touch(this.#scopeRoot);
  }

  // oxlint-disable-next-line complexity, max-lines-per-function, max-statements
  #interpret<Relic>(
    process: RuntimeProcessHandle<Relic>,
    next: RuntimeProcessNextEcho<Sigil>,
    suppressor: Suppressor,
  ): ProcessStep<Relic> {
    const scope = this.#resolve(process.scopeRef);
    const runner = process.runner();

    const [kind, sigil, accept] = fixRunningNext(next);
    switch (kind) {
      case "bind": {
        bind(scope, sigil.key, sigil.value);

        accept(VOID);
        return processInterpretedStep();
      }
      case "branch": {
        const child = this.scopeBranch(
          scope,
          sigil.entry,
          sigil.descriptor,
          scope.zone,
          suppressor,
        );
        const childScope = this.#resolve(child);

        accept({
          process: childScope.entryProcess,
          scope: childScope,
        });
        return processInterpretedStep();
      }
      case "cancel": {
        this.#reconcile(scope, cancel(scope), suppressor);
        return processExitedStep(either.left(canceledFailure));
      }
      case "cede": {
        accept(VOID);
        return processCededStep();
      }
      case "channel": {
        const channelHandle = channel(scope, sigil.capacity, sigil.overloadRewrite);
        this.#touch(channelHandle);

        accept(channelHandle.handle());
        return processInterpretedStep();
      }
      case "close": {
        const channelHandle = this.#resolve(sigil.endpoint);
        const channelScope = this.#resolve(channelHandle.scope);
        this.#reconcile(channelScope, close(channelScope, channelHandle), suppressor);

        accept(VOID);
        return processInterpretedStep();
      }
      case "defer": {
        defer(runner, (spawnCleanup) => spawnCleanup(this.#provideProcess(sigil.cleanup)));

        accept(VOID);
        return processInterpretedStep();
      }
      case "future": {
        const runtimeFuture = future(scope);
        this.#touch(runtimeFuture);

        accept(runtimeFuture.handle());
        return processInterpretedStep();
      }
      case "halt": {
        this.#reconcile(scope, halt(scope, process.keeper(), sigil.failure as Failure), suppressor);
        return processExitedStep(either.left(runner.stateAs("failed").failure));
      }
      case "lookup": {
        accept(lookup(scope, sigil.key));
        return processInterpretedStep();
      }
      case "poll": {
        accept(option.fromNullable(poll(this.#resolve(sigil.future))));
        return processInterpretedStep();
      }
      case "receive": {
        const channelHandle = this.#resolve(sigil.receiver);
        const channelScope = this.#resolve(channelHandle.scope);
        const result = this.#reconcile(
          channelScope,
          tryReceive(channelScope, channelHandle),
          suppressor,
        );
        if (result) {
          accept(result);
          return processInterpretedStep();
        }

        this.#reconcile(scope, receive(scope, channelHandle, process.keeper()), suppressor);
        return processWaitingStep();
      }
      case "self": {
        accept(self(runner));
        return processInterpretedStep();
      }
      case "send": {
        const channelHandle = this.#resolve(sigil.sender);
        const channelScope = this.#resolve(channelHandle.scope);
        const result = this.#reconcile(
          channelScope,
          trySend(channelScope, channelHandle, sigil.value),
          suppressor,
        );
        if (result) {
          accept(result);
          return processInterpretedStep();
        }

        this.#reconcile(
          scope,
          send(scope, channelHandle, sigil.value, process.keeper()),
          suppressor,
        );
        return processWaitingStep();
      }
      case "settle": {
        settle(this.#resolve(sigil.futureSettle), sigil.result, suppressor);

        accept(VOID);
        return processInterpretedStep();
      }
      case "spawn": {
        const spawnedProcess = this.#reconcile(
          scope,
          spawn(scope, this.#provideProcess(sigil.worker), sigil.descriptor),
          suppressor,
        );

        accept(spawnedProcess);
        return processInterpretedStep();
      }
      case "tryReceive": {
        const channelHandle = this.#resolve(sigil.receiver);
        const channelScope = this.#resolve(channelHandle.scope);
        const result = this.#reconcile(
          channelScope,
          tryReceive(channelScope, channelHandle),
          suppressor,
        );

        accept(option.fromNullable(result));
        return processInterpretedStep();
      }
      case "trySend": {
        const channelHandle = this.#resolve(sigil.sender);
        const channelScope = this.#resolve(channelHandle.scope);
        const result = this.#reconcile(
          channelScope,
          trySend(channelScope, channelHandle, sigil.value),
          suppressor,
        );

        accept(option.fromNullable(result));
        return processInterpretedStep();
      }
      case "unbind": {
        unbind(scope, sigil.key);

        accept(VOID);
        return processInterpretedStep();
      }
      case "wait": {
        const runtimeFuture = this.#resolve(sigil.future);
        const result = poll(runtimeFuture);
        if (result) {
          accept(result);
          return processInterpretedStep();
        }

        this.#reconcile(scope, wait(scope, runtimeFuture, process.keeper()), suppressor);
        return processWaitingStep();
      }
    }
  }

  #reconcile<Result>(
    scope: ScopeRef<unknown>,
    sync: ScopeSync<Result>,
    suppressor: Suppressor,
  ): Result {
    return this.#scopeReconciler.reconcile(scope, sync, suppressor);
  }

  #provideProcess<Relic>(worker: Ritual<Relic>): ProvideRuntimeProcess {
    return (scopeRef, descriptor) => {
      const process = RuntimeProcess.create(scopeRef, worker, descriptor);

      this.#touch(process);

      return process.keeper();
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  #touch(
    _token:
      | RuntimeScope
      | RuntimeProcessHandle<unknown>
      | RuntimeFuture<unknown>
      | RuntimeChannelHandle<unknown>,
  ): void {
    // Do nothing
  }

  #resolve<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope;
  #resolve<Relic>(processRef: ProcessRef<Relic>): RuntimeProcessHandle<Relic>;
  #resolve<Result>(futureKey: FutureKey<Result> | FutureSettleKey<Result>): RuntimeFuture<Result>;
  #resolve<Value>(
    channel: ChannelReceiver<Value> | ChannelSender<Value>,
  ): RuntimeChannelHandle<Value>;
  // oxlint-disable-next-line class-methods-use-this
  #resolve(token: unknown): unknown {
    return token;
  }

  readonly #scopeRoot!: RuntimeScope;
  readonly #scopeReconciler = new RuntimeScopeReconciler();
}

export type ScopeState = TaggedUnion<
  "status",
  {
    closed: ScopeInfo;
    closing: ScopeInfo;
    open: ScopeInfo;
  }
>;

export type ProcessState = TaggedUnion<
  "status",
  {
    closed: {};
    open: {
      readonly activity: "running" | "waiting";
    };
  }
>;

export interface ScopeInfo extends Record<string, unknown> {
  readonly children: readonly ScopeRef<unknown>[];
  readonly descriptor: ScopeDescriptor;
  readonly parent: ScopeRef<unknown> | null;
  readonly zone: ScopeZone;
}

function fixRunningNext(next: RuntimeProcessNextEcho<Sigil>): RunningNext<Sigil> {
  return [next.sigil.kind, next.sigil, next.accept] as RunningNext<Sigil>;
}

function bind<Value>(scope: RuntimeScope, key: ContextKey<Value>, value: Value): void {
  scope.bind(key, value);
}

function branch(
  scope: RuntimeScope,
  provideProcess: ProvideRuntimeProcess,
  descriptor: ScopeDescriptor,
  zone: ScopeZone,
): ScopeSync<RuntimeScope> {
  return scope.branch(provideProcess, descriptor, zone);
}

function defer(process: RuntimeProcessRunner<unknown>, cleanup: CleanupTask): void {
  process.defer(cleanup);
}

function cancel(scope: RuntimeScope): ScopeSync<void> {
  return scope.cancel();
}

function channel<Value>(
  scope: RuntimeScope,
  capacity: number,
  overloadRewrite: OverloadRewrite<Value>,
): RuntimeChannelHandle<Value> {
  return scope.createChannel<Value>(capacity, overloadRewrite);
}

function close(scope: RuntimeScope, channelHandle: RuntimeChannelHandle<unknown>): ScopeSync<void> {
  return scope.close(channelHandle);
}

function future(scope: RuntimeScope): RuntimeFuture<unknown> {
  return scope.createFuture();
}

function halt(
  scope: RuntimeScope,
  process: RuntimeProcessKeeper,
  failure: Failure,
): ScopeSync<void> {
  return scope.halt(process, failure);
}

function settle<Result>(
  runtimeFuture: RuntimeFuture<Result>,
  result: FutureResult<Result>,
  suppressor: Suppressor,
): boolean {
  return runtimeFuture.settle(result)(suppressor);
}

function spawn<Relic>(
  scope: RuntimeScope,
  provideProcess: ProvideRuntimeProcess,
  descriptor: ProcessDescriptor,
): ScopeSync<ProcessRef<Relic>> {
  return scope.spawn(provideProcess, descriptor);
}

function lookup<Value>(scope: RuntimeScope, key: ContextKey<Value>): option.Option<Value> {
  return scope.lookup(key);
}

function poll<Result>(runtimeFuture: RuntimeFuture<Result>): FutureResult<Result> | null {
  return runtimeFuture.poll();
}

function receive(
  scope: RuntimeScope,
  channelHandle: RuntimeChannelHandle<unknown>,
  process: RuntimeProcessKeeper,
): ScopeSync<void> {
  return scope.receive(channelHandle, process);
}

function self(process: RuntimeProcessRunner<unknown>): SelfHandle {
  return process.selfHandle();
}

function send<Value>(
  scope: RuntimeScope,
  channelHandle: RuntimeChannelHandle<Value>,
  value: Value,
  process: RuntimeProcessKeeper,
): ScopeSync<void> {
  return scope.send(channelHandle, value, process);
}

function tryReceive<Value>(
  scope: RuntimeScope,
  channelHandle: RuntimeChannelHandle<Value>,
): ScopeSync<ReceiveResult<Value> | null> {
  return scope.tryReceive(channelHandle);
}

function trySend<Value>(
  scope: RuntimeScope,
  channelHandle: RuntimeChannelHandle<Value>,
  value: Value,
): ScopeSync<SendResult | null> {
  return scope.trySend(channelHandle, value);
}

function wait(
  scope: RuntimeScope,
  runtimeFuture: RuntimeFuture<unknown>,
  process: RuntimeProcessKeeper,
): ScopeSync<void> {
  return scope.wait(runtimeFuture, process);
}

function unbind(scope: RuntimeScope, key: ContextKey<unknown>): void {
  scope.unbind(key);
}

function scopeInfo(scope: RuntimeScope): ScopeInfo {
  return {
    children: scope.children,
    descriptor: scope.descriptor,
    parent: scope.parent,
    zone: scope.zone,
  };
}

type RunningNext<SigilItem extends Sigil> = SigilItem extends Sigil
  ? [SigilItem["kind"], SigilItem, (echo: Echo<SigilItem>) => void]
  : never;

// oxlint-disable-next-line no-invalid-void-type, no-undefined
const VOID: void = undefined;
