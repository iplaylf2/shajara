// oxlint-disable max-lines
import type {
  ChannelReceiver,
  ChannelSender,
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
  RuntimeProcessRunnerNext,
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
import type { RuntimeChannel } from "./runtime-channel";
import { RuntimeProcess } from "./runtime-process";
import type { ScopeSync } from "./runtime-scope";
import type { ScopeZone } from "./scope-zone";
import type { TaggedUnion } from "type-fest";
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
        // oxlint-disable-next-line init-declarations
        let next: RuntimeProcessRunnerNext<Relic, Sigil>;

        try {
          next = runner.stateAs(runner.status).next();
        } catch (error) {
          const scope = this.#resolve(handle.scopeRef);
          this.#reconcile(
            scope,
            halt(scope, handle.keeper(), interruptedFailure(error)),
            suppressor,
          );

          return processExitedStep(either.left(runner.stateAs("failed").failure));
        }

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
    suppressor: Suppressor,
  ): ProcessRef<Relic> {
    return this.#reconcile(
      scope,
      spawn(this.#resolve(scope), this.#provideProcess(worker), {
        completionMode: "structural",
      }),
      suppressor,
    );
  }

  public lookup<Value>(
    scope: ScopeRef<unknown>,
    contextKey: ContextKey<Value>,
  ): option.Option<Value> {
    return this.#resolve(scope).lookup(contextKey);
  }

  public poll<Result>(
    futureKey: FutureKey<Result> | FutureSettleKey<Result>,
  ): option.Option<FutureResult<Result>> {
    return this.#resolve(futureKey).poll();
  }

  public wait<Result>(
    futureKey: FutureKey<Result> | FutureSettleKey<Result>,
    onSettled: FutureSettler<Result>,
  ): Disposer {
    return this.#resolve(futureKey).wait(onSettled);
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

  // oxlint-disable-next-line complexity,max-lines-per-function, max-statements
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
        const runtimeChannel = channel(scope, sigil.capacity);
        this.#touch(runtimeChannel);

        accept(runtimeChannel.handle());
        return processInterpretedStep();
      }
      case "close": {
        close(this.#resolve(sigil.endpoint), suppressor);

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
        accept(poll(this.#resolve(sigil.future)));
        return processInterpretedStep();
      }
      case "receive": {
        const runtimeChannel = this.#resolve(sigil.receiver);

        if (runtimeChannel.isReceiveReady) {
          const result = receiveNonBlock(runtimeChannel, suppressor);

          accept(result);
          return processInterpretedStep();
        }

        this.#reconcile(scope, receive(scope, runtimeChannel, process.keeper()), suppressor);
        return processWaitingStep();
      }
      case "self": {
        accept(self(runner));
        return processInterpretedStep();
      }
      case "send": {
        const runtimeChannel = this.#resolve(sigil.sender);

        if (runtimeChannel.isSendReady) {
          const result = sendNonBlock(runtimeChannel, sigil.value, suppressor);

          accept(result);
          return processInterpretedStep();
        }

        this.#reconcile(
          scope,
          send(scope, runtimeChannel, sigil.value, process.keeper()),
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
      case "unbind": {
        unbind(scope, sigil.key);
        accept(VOID);
        return processInterpretedStep();
      }
      case "wait": {
        const runtimeFuture = this.#resolve(sigil.future);

        if (runtimeFuture.isSettled) {
          const result = waitNonBlock(runtimeFuture);

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
      | RuntimeChannel<unknown>,
  ): void {
    // Do nothing
  }

  #resolve<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope;
  #resolve<Relic>(processRef: ProcessRef<Relic>): RuntimeProcessHandle<Relic>;
  #resolve<Result>(futureKey: FutureKey<Result> | FutureSettleKey<Result>): RuntimeFuture<Result>;
  #resolve<Value>(channel: ChannelReceiver<Value> | ChannelSender<Value>): RuntimeChannel<Value>;
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

function channel<Value>(scope: RuntimeScope, capacity: number): RuntimeChannel<Value> {
  return scope.createChannel<Value>(capacity);
}

function close(runtimeChannel: RuntimeChannel<unknown>, suppressor: Suppressor): void {
  runtimeChannel.close(suppressor);
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
): void {
  runtimeFuture.settle(result)(suppressor);
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

function poll<Result>(runtimeFuture: RuntimeFuture<Result>): option.Option<FutureResult<Result>> {
  return runtimeFuture.poll();
}

function receiveNonBlock<Value>(
  runtimeChannel: RuntimeChannel<Value>,
  suppressor: Suppressor,
): ReceiveResult<Value> {
  return runtimeChannel.receiveNonBlock(suppressor);
}

function receive(
  scope: RuntimeScope,
  runtimeChannel: RuntimeChannel<unknown>,
  process: RuntimeProcessKeeper,
): ScopeSync<void> {
  return scope.receive(runtimeChannel, process);
}

function self(process: RuntimeProcessRunner<unknown>): SelfHandle {
  return process.selfHandle();
}

function sendNonBlock<Value>(
  runtimeChannel: RuntimeChannel<Value>,
  value: Value,
  suppressor: Suppressor,
): SendResult {
  return runtimeChannel.sendNonBlock(value, suppressor);
}

function send<Value>(
  scope: RuntimeScope,
  runtimeChannel: RuntimeChannel<Value>,
  value: Value,
  process: RuntimeProcessKeeper,
): ScopeSync<void> {
  return scope.send(runtimeChannel, value, process);
}

function waitNonBlock<Result>(runtimeFuture: RuntimeFuture<Result>): FutureResult<Result> {
  const pollResult = runtimeFuture.poll() as option.Some<FutureResult<Result>>;

  return pollResult.value;
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
