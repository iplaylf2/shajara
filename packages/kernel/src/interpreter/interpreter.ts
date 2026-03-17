// oxlint-disable max-statements
// oxlint-disable max-lines-per-function
// oxlint-disable class-methods-use-this
import type {
  BindSigil,
  BranchSigil,
  HaltSigil,
  LookupSigil,
  PollSigil,
  ReceiveSigil,
  SendSigil,
  SettleSigil,
  Sigil,
  SpawnSigil,
  UnbindSigil,
} from "#src/sigils";
import type {
  ContextKey,
  FailureShape,
  FutureKey,
  FutureResult,
  FutureSettleKey,
  ProcessRef,
  Ritual,
  ScopeRef,
  Wisp,
} from "#src/contracts";
import {
  blockOnFuture,
  createFuture,
  createProcess,
  createProcessRef,
  queueContinuation,
  settleFuture,
} from "./runtime";
import {
  blockedProcessStage,
  cededProcessStage,
  exitedProcessStage,
  interpretedProcessStage,
  resonatedProcessStage,
} from "./process-stage";
import { branchDescriptor, selfDescriptor } from "./runtime-access";
import type { Option } from "#src/utils";
import type { ProcessStage } from "./process-stage";
import type { RuntimeProcess } from "./runtime";
import { ScopeFrame } from "./scope-frame";
import { evoke } from "#src/contracts";
import { isSome } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";
import { standardScopeSpec } from "#src/scopes";
import { unitEcho } from "./step-support";

const PROCESS_COUNT_EMPTY = 0;

export class Interpreter {
  public constructor(protected readonly entry: Ritual<void>) {
    this.#rootFrame = ScopeFrame.create(standardScopeSpec(), (frame) =>
      this.#createProcess(frame, entry, "tracked"),
    );
  }

  public step<Relic>(processRef: ProcessRef<Relic>): ProcessStage<Relic> {
    const process = this.#readProcess(processRef);

    if (process.status === "blocked") {
      return blockedProcessStage(processRef);
    }

    if (process.status === "exited") {
      return exitedProcessStage(processRef, process.result as FutureResult<Relic>);
    }

    if (process.continuation !== null) {
      return this.#resonateWisp(process);
    }

    return this.#interpretWisp(process);
  }

  public get scopeRoot(): ScopeRef<unknown> {
    return this.#rootFrame.ref;
  }

  public get processRoot(): ProcessRef<unknown> {
    return this.#rootFrame.processRef;
  }

  public get isClosed(): boolean {
    return this.#rootFrame.isClosed;
  }

  protected onReady(_process: ProcessRef<unknown>): void {
    //
  }

  protected onClose(
    _scope: ScopeRef<unknown>,
    _process: ProcessRef<unknown>,
    failure: FailureShape,
  ): Wisp<FailureShape> {
    return evoke(failure);
  }

  public spawn<Relic>(scope: ScopeRef<unknown>, worker: Ritual<Relic>): ProcessRef<Relic> {
    return this.#createProcess(this.#rootFrame.resolve(scope), worker, "tracked").ref;
  }

  public lookup<Value>(scope: ScopeRef<unknown>, contextKey: ContextKey<Value>): Option<Value> {
    return this.#rootFrame.resolve(scope).lookup(contextKey);
  }

  public poll<Result>(future: FutureKey<Result>): Option<FutureResult<Result>> {
    return this.#rootFrame.poll(future);
  }

  public wait<Result>(
    future: FutureKey<Result>,
    onSettled: (result: FutureResult<Result>) => void,
  ): void {
    this.#rootFrame.wait(future, onSettled);
  }

  #interpretWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStage<Relic> {
    const current = process.wisp;

    if (current.bearing === "resting") {
      this.#rootFrame.completeProcess(process, current.relic);
      return exitedProcessStage(process.ref, process.result as FutureResult<Relic>);
    }

    const sigil = current.sigil as Sigil;

    switch (sigil.kind) {
      case "bind":
        this.#bind(process, sigil);
        this.#setContinuation(process, current.resonate, unitEcho());
        return interpretedProcessStage(process.ref);
      case "branch":
        this.#setContinuation(process, current.resonate, this.#branch(process, sigil));
        return interpretedProcessStage(process.ref);
      case "cede":
        this.#setContinuation(process, current.resonate, unitEcho());
        return cededProcessStage(process.ref);
      case "future":
        this.#setContinuation(process, current.resonate, this.#future());
        return interpretedProcessStage(process.ref);
      case "halt":
        this.#halt(process, sigil);
        return exitedProcessStage(process.ref, process.result as FutureResult<Relic>);
      case "lookup":
        this.#setContinuation(process, current.resonate, this.#lookupInScope(process, sigil));
        return interpretedProcessStage(process.ref);
      case "poll":
        this.#setContinuation(process, current.resonate, this.#inspectFuture(sigil));
        return interpretedProcessStage(process.ref);
      case "self":
        this.#setContinuation(process, current.resonate, this.#describeSelf(process));
        return interpretedProcessStage(process.ref);
      case "settle":
        this.#settle(sigil);
        this.#setContinuation(process, current.resonate, unitEcho());
        return interpretedProcessStage(process.ref);
      case "spawn":
        this.#setContinuation(process, current.resonate, this.#spawn(process, sigil));
        return interpretedProcessStage(process.ref);
      case "unbind":
        this.#unbind(process, sigil);
        this.#setContinuation(process, current.resonate, unitEcho());
        return interpretedProcessStage(process.ref);
      case "wait": {
        const settled = this.#pollFuture(sigil.future);

        if (isSome(settled)) {
          this.#setContinuation(process, current.resonate, settled.value);
          return interpretedProcessStage(process.ref);
        }

        this.#waitFuture(process, sigil.future, current.resonate);
        return blockedProcessStage(process.ref);
      }
      case "receive": {
        const received = this.#receive(process, sigil);

        if (isSome(received)) {
          this.#setContinuation(process, current.resonate, received.value);
          return interpretedProcessStage(process.ref);
        }

        this.#blockReceive(process, sigil, current.resonate);
        return blockedProcessStage(process.ref);
      }
      case "send":
        this.#send(sigil);
        this.#setContinuation(process, current.resonate, unitEcho());
        return interpretedProcessStage(process.ref);
    }
  }

  #resonateWisp<Relic>(process: RuntimeProcess<Relic>): ProcessStage<Relic> {
    const { continuation } = process;

    if (continuation === null) {
      throw new Error("Expected a queued continuation before resonance.");
    }

    process.continuation = null;
    process.wisp = continuation.resume(continuation.echo);
    return resonatedProcessStage(process.ref);
  }

  #bind(process: RuntimeProcess, sigil: BindSigil<unknown>): void {
    this.#rootFrame.resolve(process.scope.ref).bind(sigil.key, sigil.value);
  }

  #branch(
    process: RuntimeProcess,
    sigil: BranchSigil<unknown>,
  ): ReturnType<typeof branchDescriptor> {
    const branchFrame = this.#rootFrame
      .resolve(process.scope.ref)
      .branch(sigil.spec, (frame) => this.#createProcess(frame, sigil.entry, "tracked"));
    const branchProcess = this.#readProcess(branchFrame.processRef);
    return branchDescriptor(branchProcess, branchFrame.runtime);
  }

  #future(): readonly [FutureKey<unknown>, FutureSettleKey<unknown>] {
    const created = createFuture<unknown>();
    this.#rootFrame.registerFuture(created.future);
    return [created.key, created.settleKey];
  }

  #halt(_process: RuntimeProcess, _sigil: HaltSigil): void {
    notImplemented("Interpreter.halt sigil execution");
  }

  #settle(sigil: SettleSigil<unknown>): void {
    const future = this.#rootFrame.requireFutureBySettle(sigil.futureSettle);
    const unblocked = settleFuture(future, sigil.result as FutureResult<unknown>);

    for (const readyProcess of unblocked) {
      this.onReady(readyProcess.ref);
    }
  }

  #spawn(process: RuntimeProcess, sigil: SpawnSigil<unknown>): ProcessRef<unknown> {
    const spawned = this.#createProcess(
      this.#rootFrame.resolve(process.scope.ref),
      sigil.ritual,
      sigil.participation,
    );
    return spawned.ref;
  }

  #lookupInScope(process: RuntimeProcess, sigil: LookupSigil<unknown>): Option<unknown> {
    return this.lookup(process.scope.ref, sigil.key);
  }

  #inspectFuture(sigil: PollSigil<unknown>): Option<FutureResult<unknown>> {
    return this.poll(sigil.future);
  }

  #describeSelf(process: RuntimeProcess): ReturnType<typeof selfDescriptor> {
    return selfDescriptor(process);
  }

  #pollFuture<Result>(futureRef: FutureKey<Result>): Option<FutureResult<Result>> {
    return this.#rootFrame.poll(futureRef);
  }

  #waitFuture(
    process: RuntimeProcess,
    futureRef: FutureKey<unknown>,
    resume: (echo: unknown) => Wisp<unknown>,
  ): void {
    this.#blockFuture(process, futureRef, resume);
  }

  #queueContinuation(
    process: RuntimeProcess,
    resume: (echo: unknown) => Wisp<unknown>,
    echo: unknown,
  ): void {
    queueContinuation(process, resume, echo);
  }

  #setContinuation(
    process: RuntimeProcess,
    resume: (echo: unknown) => Wisp<unknown>,
    echo: unknown,
  ): void {
    this.#queueContinuation(process, resume, echo);
  }

  #blockFuture(
    process: RuntimeProcess,
    futureRef: FutureKey<unknown>,
    resume: (echo: unknown) => Wisp<unknown>,
  ): void {
    blockOnFuture(process, this.#rootFrame.requireFuture(futureRef), resume);
  }

  #unbind(process: RuntimeProcess, sigil: UnbindSigil): void {
    this.#rootFrame.resolve(process.scope.ref).unbind(sigil.key);
  }

  #receive(_process: RuntimeProcess, _sigil: ReceiveSigil<unknown>): Option<unknown> {
    return notImplemented("Interpreter.receive sigil execution");
  }

  #blockReceive(
    _process: RuntimeProcess,
    _sigil: ReceiveSigil<unknown>,
    _resume: (echo: unknown) => Wisp<unknown>,
  ): void {
    notImplemented("Interpreter.receive sigil blocking");
  }

  #send(_sigil: SendSigil<unknown>): void {
    notImplemented("Interpreter.send sigil execution");
  }

  #createProcess<Relic>(
    frame: ScopeFrame,
    ritual: Ritual<Relic>,
    participation: "tracked" | "auxiliary",
  ): RuntimeProcess<Relic> {
    const scope = frame.runtime;
    const ref = this.#createProcessRefOf<Relic>(frame);

    if (this.#isEntryProcess(frame)) {
      this.#rootFrame.registerFuture(scope.exitFuture);
    }

    const process = this.#registerProcess(createProcess(scope, ritual, participation, ref));
    this.onReady(process.ref);
    return process;
  }

  #createProcessRefOf<Relic>(frame: ScopeFrame): ProcessRef<Relic> {
    if (this.#isEntryProcess(frame)) {
      return frame.processRef as ProcessRef<Relic>;
    }

    return createProcessRef<Relic>();
  }

  #isEntryProcess(frame: ScopeFrame): boolean {
    return frame.runtime.processes.size === PROCESS_COUNT_EMPTY;
  }

  #readProcess<Relic>(processRef: ProcessRef<Relic>): RuntimeProcess<Relic> {
    return this.#rootFrame.readProcess(processRef);
  }

  #registerProcess<Relic>(process: RuntimeProcess<Relic>): RuntimeProcess<Relic> {
    return this.#rootFrame.registerProcess(process);
  }
  readonly #rootFrame: ScopeFrame;
}

export type * from "./process-stage";
