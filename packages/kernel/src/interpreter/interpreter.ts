// oxlint-disable max-lines-per-function
// oxlint-disable class-methods-use-this
import type {
  BindSigil,
  BranchHandle,
  BranchSigil,
  HaltSigil,
  LookupSigil,
  PollSigil,
  ReceiveSigil,
  SelfHandle,
  SendSigil,
  SettleSigil,
  Sigil,
  SpawnSigil,
  UnbindSigil,
} from "#src/sigils";
import type {
  ContextKey,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  ProcessRef,
  Resonance,
  Ritual,
  ScopeRef,
  SigilShape,
  StirringWisp,
  Wisp,
} from "#src/contracts";
import {
  processCededStep,
  processExitedStep,
  processInterpretedStep,
  processResonatedStep,
  processWaitingStep,
} from "./process-step";
import type { Failure } from "#src/failures";
import type { Option } from "#src/utils";
import type { ProcessStep } from "./process-step";
import { RuntimeGraph } from "./runtime-graph";
import { RuntimeProcess } from "./runtime-process";
import { RuntimeScope } from "./runtime-scope";
import { evoke } from "#src/contracts";
import { isSome } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";
import { standardScopeSpec } from "#src/scopes";

export class Interpreter {
  public constructor(protected readonly entry: Ritual<void>) {
    this.#rootScope = RuntimeScope.create(standardScopeSpec(), (scope, exitFuture) =>
      this.#enterBranch(scope, exitFuture, entry),
    );
    this.#runtime.registerScope(this.#rootScope);
  }

  public step<Relic>(processRef: ProcessRef<Relic>): ProcessStep<Relic> {
    const process = this.#readProcess(processRef);

    switch (process.status) {
      case "waiting":
        return processWaitingStep(processRef);
      case "completed":
        return processExitedStep(processRef, process.result as FutureResult<Relic>);
      case "runnable":
        if (process.hasQueuedContinuation) {
          return this.#resonateWisp(process);
        }

        return this.#interpretWisp(process);
    }
  }

  public observeRunnable(_listener: (process: ProcessRef<unknown>) => void): () => void {
    return notImplemented("Interpreter.observeRunnable");
  }

  public get scopeRoot(): ScopeRef<unknown> {
    return this.#rootScope.ref;
  }

  public get processRoot(): ProcessRef<unknown> {
    return this.#rootScope.processRef;
  }

  public get isClosed(): boolean {
    return this.#rootScope.closed;
  }

  protected onClosing(
    _scope: ScopeRef<unknown>,
    _processes: readonly ProcessRef<unknown>[],
    failure: Failure,
  ): Wisp<Failure> {
    return evoke(failure);
  }

  public spawn<Relic>(scope: ScopeRef<unknown>, worker: Ritual<Relic>): ProcessRef<Relic> {
    return this.#spawnIn(this.#resolveScope(scope), worker, "tracked");
  }

  public lookup<Value>(scope: ScopeRef<unknown>, contextKey: ContextKey<Value>): Option<Value> {
    return this.#resolveScope(scope).lookup(contextKey);
  }

  public poll<Result>(future: FutureKey<Result>): Option<FutureResult<Result>> {
    return this.#runtime.poll(future);
  }

  public wait<Result>(
    future: FutureKey<Result>,
    onSettled: (result: FutureResult<Result>) => void,
  ): void {
    this.#runtime.wait(future, onSettled);
  }

  // oxlint-disable-next-line max-statements
  #interpretWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStep<Relic> {
    // `Step` only reaches `#interpretWisp` when there is no queued continuation.
    // Process is not completed here, so the current wisp must still be stirring.
    const current = process.wisp as StirringWisp<Sigil, Relic>;
    const sigil = current.sigil as Sigil;

    switch (sigil.kind) {
      case "bind":
        this.#bind(process, sigil);
        this.#setContinuation(process, current.resonate, null);
        return processInterpretedStep(process.ref);
      case "branch":
        this.#setContinuation(process, current.resonate, this.#branch(process, sigil));
        return processInterpretedStep(process.ref);
      case "cede":
        this.#setContinuation(process, current.resonate, null);
        return processCededStep(process.ref);
      case "future":
        this.#setContinuation(process, current.resonate, this.#future(process));
        return processInterpretedStep(process.ref);
      case "halt":
        this.#halt(process, sigil);
        return processExitedStep(process.ref, process.result as FutureResult<Relic>);
      case "lookup":
        this.#setContinuation(process, current.resonate, this.#lookup(process, sigil));
        return processInterpretedStep(process.ref);
      case "poll":
        this.#setContinuation(process, current.resonate, this.#poll(sigil));
        return processInterpretedStep(process.ref);
      case "self":
        this.#setContinuation(process, current.resonate, this.#self(process));
        return processInterpretedStep(process.ref);
      case "settle":
        this.#settle(sigil);
        this.#setContinuation(process, current.resonate, null);
        return processInterpretedStep(process.ref);
      case "spawn":
        this.#setContinuation(process, current.resonate, this.#spawn(process, sigil));
        return processInterpretedStep(process.ref);
      case "unbind":
        this.#unbind(process, sigil);
        this.#setContinuation(process, current.resonate, null);
        return processInterpretedStep(process.ref);
      case "wait": {
        const settled = this.poll(sigil.future);

        if (isSome(settled)) {
          this.#setContinuation(process, current.resonate, settled.value);
          return processInterpretedStep(process.ref);
        }

        this.#wait(process, sigil);
        this.#primeContinuation(process, current.resonate);
        return processWaitingStep(process.ref);
      }
      case "receive": {
        const received = this.#tryReceive(process, sigil);

        if (isSome(received)) {
          this.#setContinuation(process, current.resonate, received.value);
          return processInterpretedStep(process.ref);
        }

        this.#receive(process, sigil);
        this.#primeContinuation(process, current.resonate);
        return processWaitingStep(process.ref);
      }
      case "send":
        this.#send(process, sigil);
        this.#setContinuation(process, current.resonate, null);
        return processInterpretedStep(process.ref);
    }
  }

  #resonateWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStep<Relic> {
    process.resonate();

    if (process.status === "completed") {
      return processExitedStep(process.ref, process.result as FutureResult<Relic>);
    }

    return processResonatedStep(process.ref);
  }

  #bind(process: RuntimeProcess, sigil: BindSigil<unknown>): void {
    this.#resolveScope(process.scopeRef).bind(sigil.key, sigil.value);
  }

  #branch(process: RuntimeProcess, sigil: BranchSigil<unknown>): BranchHandle<unknown> {
    const branchScope = this.#resolveScope(process.scopeRef).branch(
      sigil.spec,
      (scope, exitFuture) => this.#enterBranch(scope, exitFuture, sigil.entry),
    );

    this.#runtime.registerScope(branchScope);
    return {
      processRef: branchScope.processRef,
      scopeRef: branchScope.ref,
    };
  }

  #future(process: RuntimeProcess): readonly [FutureKey<unknown>, FutureSettleKey<unknown>] {
    const scope = this.#resolveScope(process.scopeRef);
    const [future, settle] = scope.createFuture();

    this.#runtime.registerFuture(scope, future);
    return [future, settle];
  }

  #halt(process: RuntimeProcess, sigil: HaltSigil): void {
    this.#resolveScope(process.scopeRef).halt(
      process.ref,
      sigil.failure,
      (scope, processes, failure) => () => this.onClosing(scope, processes, failure),
    );
  }

  #settle(sigil: SettleSigil<unknown>): void {
    const unblocked = this.#runtime.settleFuture(sigil.futureSettle, sigil.result);

    for (const processRef of unblocked) {
      this.#readProcess(processRef).unblock(sigil.result);
    }
  }

  #spawn(process: RuntimeProcess, sigil: SpawnSigil<unknown>): ProcessRef<unknown> {
    return this.#spawnIn(this.#resolveScope(process.scopeRef), sigil.ritual, sigil.participation);
  }

  #lookup(process: RuntimeProcess, sigil: LookupSigil<unknown>): Option<unknown> {
    return this.lookup(process.scopeRef, sigil.key);
  }

  #poll(sigil: PollSigil<unknown>): Option<FutureResult<unknown>> {
    return this.poll(sigil.future);
  }

  #self(process: RuntimeProcess): SelfHandle<ScopeRef<unknown>> {
    return process.selfHandle();
  }

  #wait(process: RuntimeProcess, sigil: { readonly future: FutureKey<unknown> }): void {
    process.wait(sigil.future);
    this.#runtime.blockProcessOnFuture(sigil.future, process.ref);
  }

  #unbind(process: RuntimeProcess, sigil: UnbindSigil): void {
    this.#resolveScope(process.scopeRef).unbind(sigil.key);
  }

  #tryReceive(process: RuntimeProcess, sigil: ReceiveSigil<unknown>): Option<unknown> {
    return this.#resolveScope(process.scopeRef).tryReceive(sigil.messageKey);
  }

  #receive(process: RuntimeProcess, sigil: ReceiveSigil<unknown>): void {
    process.receive();
    this.#resolveScope(process.scopeRef).receive(process.ref, sigil.messageKey);
  }

  #send(process: RuntimeProcess, sigil: SendSigil<unknown>): void {
    const senderScope = this.#resolveScope(process.scopeRef);
    const targetScope = this.#resolveScope(sigil.scope);
    const unblocked = targetScope.send(sigil.messageKey, senderScope.ref, sigil.value);

    if (unblocked === null) {
      return;
    }

    this.#readProcess(unblocked).unblock(sigil.value);
  }

  #setContinuation(
    process: RuntimeProcess,
    resonate: Resonance<SigilShape, unknown>,
    echo: unknown,
  ): void {
    process.setContinuation(resonate, echo);
  }

  #primeContinuation(process: RuntimeProcess, resonate: Resonance<SigilShape, unknown>): void {
    process.primeContinuation(resonate);
  }

  #enterBranch(
    scope: RuntimeScope,
    exitFuture: FutureKey<unknown>,
    ritual: Ritual<unknown>,
  ): ProcessRef<unknown> {
    const process = new RuntimeProcess(scope.ref, exitFuture, ritual, "tracked");

    this.#runtime.registerProcess(process);
    return process.ref;
  }

  #spawnIn<Relic>(
    scope: RuntimeScope,
    ritual: Ritual<Relic>,
    participation: "tracked" | "auxiliary",
  ): ProcessRef<Relic> {
    return scope.spawn<Relic>((exitFuture) => {
      const process = new RuntimeProcess<Relic>(scope.ref, exitFuture, ritual, participation);

      this.#runtime.registerProcess(process);
      return process.ref;
    });
  }

  #resolveScope<Relic>(scopeRef: ScopeRef<Relic>): RuntimeScope {
    return this.#runtime.resolveScope(scopeRef);
  }

  #readProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    return this.#runtime.readProcess(processRef);
  }

  readonly #rootScope: RuntimeScope;
  readonly #runtime = new RuntimeGraph();
}
