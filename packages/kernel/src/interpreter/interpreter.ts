// oxlint-disable max-lines
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
  MessageKey,
  ProcessRef,
  Ritual,
  ScopeRef,
  Suppressor,
} from "#/contracts";
import type { FutureSettler, RuntimeFuture } from "./runtime-future";
import type { ProcessDescriptor, ScopeDescriptor, SelfHandle, Sigil } from "#/sigils";
import { canceledFailure, interruptedFailure } from "#/failures";
import { either, option } from "fp-ts";
import {
  processCededStep,
  processExitedStep,
  processInterpretedStep,
  processResonatedStep,
  processWaitingStep,
} from "./process-step";
import type { Disposer } from "#/utils";
import type { Failure } from "#/failures";
import type { ProcessStep } from "./process-step";
import { RuntimeProcess } from "./runtime-process";
import { RuntimeScope } from "./runtime-scope";
import type { ScopeZone } from "./scope-zone";
import type { TaggedUnion } from "type-fest";
import { unreachable } from "#/utils";

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
          halt(
            this.#resolve(handle.scopeRef),
            handle.keeper(),
            interruptedFailure(error),
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
            scope.complete(handle.keeper(), next.relic, suppressor);
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
    return this.#resolve(scope).spawn(
      this.#provideProcess(worker),
      {
        completionMode: "structural",
      },
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
    future: FutureKey<Result> | FutureSettleKey<Result>,
  ): option.Option<FutureResult<Result>> {
    return this.#resolve(future).poll();
  }

  public wait<Result>(
    future: FutureKey<Result> | FutureSettleKey<Result>,
    onSettled: FutureSettler<Result>,
  ): Disposer {
    return this.#resolve(future).wait(onSettled);
  }

  public forceFailed(scope: ScopeRef<unknown>, failure: Failure, suppressor: Suppressor): void {
    this.#resolve(scope).forceFailed(failure, suppressor);
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
    const childScope = branch(
      this.#resolve(scope),
      this.#provideProcess(entry),
      descriptor,
      zone,
      suppressor,
    );
    this.#touch(childScope);
    return childScope;
  }

  protected initialize(): void {
    // oxlint-disable-next-line no-explicit-any
    (this as any).#scopeRoot = RuntimeScope.root(
      this.#provideProcess(this.entry),
      { failureMode: "contain" },
      this.zoneRoot,
      { capture: unreachable },
    );

    this.#touch(this.#scopeRoot);
  }

  // oxlint-disable-next-line max-lines-per-function, max-statements
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
      case "cede": {
        accept(VOID);
        return processCededStep();
      }
      case "cancel": {
        cancel(scope, suppressor);
        return processExitedStep(either.left(canceledFailure));
      }
      case "defer": {
        defer(runner, (spawnCleanup) => {
          spawnCleanup(this.#provideProcess(sigil.cleanup));
        });

        accept(VOID);
        return processInterpretedStep();
      }
      case "future": {
        const future = createFuture(scope);
        this.#touch(future);

        accept(future.handle());
        return processInterpretedStep();
      }
      case "halt": {
        halt(scope, process.keeper(), sigil.failure as Failure, suppressor);
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
      case "self": {
        accept(self(runner));
        return processInterpretedStep();
      }
      case "settle": {
        settle(this.#resolve(sigil.futureSettle), sigil.result, suppressor);
        accept(VOID);
        return processInterpretedStep();
      }
      case "spawn": {
        const spawnedProcess = spawn(
          scope,
          this.#provideProcess(sigil.worker),
          sigil.descriptor,
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
        const future = this.#resolve(sigil.future);

        const settled = tryWait(future);
        if (option.isSome(settled)) {
          accept(settled.value);
          return processInterpretedStep();
        }

        wait(scope, process.keeper(), future, suppressor);
        return processWaitingStep();
      }
      case "receive": {
        const received = tryReceive(scope, sigil.messageKey);

        if (option.isSome(received)) {
          accept(received.value);
          return processInterpretedStep();
        }

        receive(scope, process.keeper(), sigil.messageKey, suppressor);
        return processWaitingStep();
      }
      case "send": {
        send(scope, this.#resolve(sigil.scope), sigil.messageKey, sigil.value, suppressor);
        accept(VOID);
        return processInterpretedStep();
      }
    }
  }

  #provideProcess<Relic>(worker: Ritual<Relic>): ProvideRuntimeProcess {
    return (scopeRef, descriptor) => {
      const process = RuntimeProcess.create(scopeRef, worker, descriptor);

      this.#touch(process);

      return process.keeper();
    };
  }

  // oxlint-disable-next-line class-methods-use-this
  #touch(_token: RuntimeScope | RuntimeProcessHandle<unknown> | RuntimeFuture<unknown>): void {
    // Do nothing
  }

  #resolve<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope;
  #resolve<Relic>(processRef: ProcessRef<Relic>): RuntimeProcessHandle<Relic>;
  #resolve<Result>(futureKey: FutureKey<Result> | FutureSettleKey<Result>): RuntimeFuture<Result>;
  // oxlint-disable-next-line class-methods-use-this
  #resolve(token: unknown): unknown {
    return token;
  }

  readonly #scopeRoot!: RuntimeScope;
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

// oxlint-disable-next-line max-params
function branch(
  scope: RuntimeScope,
  provideProcess: ProvideRuntimeProcess,
  descriptor: ScopeDescriptor,
  zone: ScopeZone,
  suppressor: Suppressor,
): RuntimeScope {
  return scope.branch(provideProcess, descriptor, zone, suppressor);
}

function defer(process: RuntimeProcessRunner<unknown>, cleanup: CleanupTask): void {
  process.defer(cleanup);
}

function cancel(scope: RuntimeScope, suppressor: Suppressor): void {
  scope.cancel(suppressor);
}

function createFuture(scope: RuntimeScope): RuntimeFuture<unknown> {
  return scope.createFuture();
}

function halt(
  scope: RuntimeScope,
  process: RuntimeProcessKeeper,
  failure: Failure,
  suppressor: Suppressor,
): void {
  scope.halt(process, failure, suppressor);
}

function settle<Result>(
  future: RuntimeFuture<Result>,
  result: FutureResult<Result>,
  suppressor: Suppressor,
): void {
  future.settle(result)(suppressor);
}

function spawn<Relic>(
  scope: RuntimeScope,
  provideProcess: ProvideRuntimeProcess,
  descriptor: ProcessDescriptor,
  suppressor: Suppressor,
): ProcessRef<Relic> {
  return scope.spawn(provideProcess, descriptor, suppressor);
}

function lookup<Value>(scope: RuntimeScope, key: ContextKey<Value>): option.Option<Value> {
  return scope.lookup(key);
}

function poll<Result>(future: RuntimeFuture<Result>): option.Option<FutureResult<Result>> {
  return future.poll();
}

function self(process: RuntimeProcessRunner<unknown>): SelfHandle {
  return process.selfHandle();
}

function tryWait<Result>(future: RuntimeFuture<Result>): option.Option<FutureResult<Result>> {
  return future.poll();
}

function wait(
  scope: RuntimeScope,
  process: RuntimeProcessKeeper,
  future: RuntimeFuture<unknown>,
  suppressor: Suppressor,
): void {
  scope.wait(process, future, suppressor);
}

function unbind(scope: RuntimeScope, key: ContextKey<unknown>): void {
  scope.unbind(key);
}

function tryReceive<Value>(
  scope: RuntimeScope,
  messageKey: MessageKey<Value>,
): option.Option<Value> {
  return scope.tryReceive(messageKey);
}

function receive(
  scope: RuntimeScope,
  process: RuntimeProcessKeeper,
  messageKey: MessageKey<unknown>,
  suppressor: Suppressor,
): void {
  scope.receive(process, messageKey, suppressor);
}

// oxlint-disable-next-line max-params
function send<Value>(
  scope: RuntimeScope,
  targetScope: RuntimeScope,
  messageKey: MessageKey<Value>,
  value: Value,
  suppressor: Suppressor,
): void {
  scope.send(targetScope, messageKey, value, suppressor);
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
