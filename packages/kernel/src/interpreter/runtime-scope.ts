// oxlint-disable class-methods-use-this, max-lines
import type {
  ContextKey,
  MessageKey,
  ProcessDescriptor,
  Ritual,
  ScopeDescriptor,
  ScopeRef,
} from "#src/contracts";
import { none, some } from "#src/utils";
import type { Failure } from "#src/failures";
import type { Option } from "#src/utils";
import type { RuntimeCell } from "./runtime-process";
import { RuntimeFuture } from "./runtime-future";
import { RuntimeProcess } from "./runtime-process";
import type { ScopeClosing } from "./scope-closing";
import { notImplemented } from "#src/internal/not-implemented";
import { scopeTerminated } from "#src/failures";

const EMPTY_QUEUE_SIZE = 0;

export class RuntimeScope {
  public static create(
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zoneBuilder: RuntimeZoneBuilder,
  ): RuntimeScope {
    return new RuntimeScope(entry, descriptor, RuntimeScope.#sentinel, zoneBuilder);
  }

  public branch(
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    zoneBuilder: RuntimeZoneBuilder = () => this.#zone,
  ): RuntimeScope {
    const child = new RuntimeScope(entry, descriptor, this, zoneBuilder);

    this.#children.add(child);

    return child;
  }

  public lookup<Value>(contextKey: ContextKey<Value>): Option<Value> {
    if (this.#bindings.has(contextKey)) {
      return some(this.#bindings.get(contextKey) as Value);
    }

    if (this.#parent === RuntimeScope.#sentinel) {
      return none;
    }

    return this.#parent.lookup(contextKey);
  }

  public bind<Value>(contextKey: ContextKey<Value>, value: Value): void {
    this.#bindings.set(contextKey, value);
  }

  public unbind(contextKey: ContextKey<unknown>): void {
    this.#bindings.delete(contextKey);
  }

  public send<Value>(targetScope: RuntimeScope, messageKey: MessageKey<Value>, value: Value): void {
    targetScope.#acceptMessage(messageKey, value);
  }

  public tryReceive<Value>(messageKey: MessageKey<Value>): Option<Value> {
    const mailboxQueue = this.#mailboxes.get(messageKey);

    if (!mailboxQueue || mailboxQueue.length === EMPTY_QUEUE_SIZE) {
      return none;
    }

    const value = mailboxQueue.shift() as Value;

    return some(value);
  }

  public receive(process: RuntimeProcess, messageKey: MessageKey<unknown>): void {
    process.receive(messageKey);

    this.#registerReceiver(messageKey, process);
  }

  public spawn<Relic>(ritual: Ritual<Relic>, descriptor: ProcessDescriptor): RuntimeProcess<Relic> {
    const spawnedProcess = new RuntimeProcess<Relic>(this.#ref, ritual, descriptor, (process) =>
      this.#buildCell(process),
    );

    this.#spawnedProcesses.add(spawnedProcess);

    return spawnedProcess;
  }

  public halt(process: RuntimeProcess, failure: Failure): void {
    process.fail(failure);

    const closing = this.#enterClosing();

    this.#spawnClosing(closing);
  }

  public createFuture<Result>(): RuntimeFuture<Result> {
    const future = RuntimeFuture.create<Result>();

    this.#derivedFutures.add(future);

    return future;
  }

  public get ref(): ScopeRef<unknown> {
    return this.#ref;
  }

  public get descriptor(): ScopeDescriptor {
    return this.#descriptor;
  }

  public get status(): RuntimeScopeStatus {
    return this.#status;
  }

  public get isClosed(): boolean {
    return this.#status === "closed";
  }

  public get exitFuture(): RuntimeFuture<unknown> {
    return this.#exitFuture;
  }

  public get entryProcess(): RuntimeProcess {
    return this.#process;
  }

  private constructor(
    entry: Ritual<unknown>,
    descriptor: ScopeDescriptor,
    parent: RuntimeScope,
    zoneBuilder: RuntimeZoneBuilder,
  ) {
    this.#exitFuture = RuntimeFuture.create<unknown>();
    const [scopeExitFuture] = this.#exitFuture.handle;
    this.#ref = { exitFuture: scopeExitFuture } as ScopeRef<unknown>;

    const entryProcess = new RuntimeProcess(
      this.#ref,
      entry,
      { completionMode: "structural" },
      (process) => this.#buildCell(process),
    );

    this.#process = entryProcess;
    this.#descriptor = descriptor;

    this.#parent = parent;
    this.#zone = zoneBuilder(this);
  }

  #acceptMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    if (this.#deliverToReceiver(messageKey, value)) {
      return;
    }

    this.#bufferMessage(messageKey, value);
  }

  #deliverToReceiver<Value>(messageKey: MessageKey<Value>, value: Value): boolean {
    const process = this.#receiverQueues.get(messageKey)?.shift();

    if (!process) {
      return false;
    }

    process.accept(value);

    return true;
  }

  #bufferMessage<Value>(messageKey: MessageKey<Value>, value: Value): void {
    const mailboxQueue = this.#mailboxes.get(messageKey);

    if (mailboxQueue) {
      mailboxQueue.push(value);
    } else {
      this.#mailboxes.set(messageKey, [value]);
    }
  }

  #registerReceiver(messageKey: MessageKey<unknown>, process: RuntimeProcess): void {
    const receiveQueue = this.#receiverQueues.get(messageKey);

    if (receiveQueue) {
      receiveQueue.push(process);
    } else {
      this.#receiverQueues.set(messageKey, [process]);
    }
  }

  #buildCell(process: RuntimeProcess): RuntimeCell {
    return {
      track: () => {
        this.#zone.trackProcess(process);
      },
    };
  }

  #enterClosing(): ScopeClosing {
    this.#setStatus("closing");

    const processes = this.#terminateLocalProcesses();
    const children = [...this.#children].map((childScope) => childScope.#enterClosing());

    return {
      children,
      processes,
      scope: this,
    };
  }

  #spawnClosing(_closing: ScopeClosing): void {
    notImplemented("RuntimeScope closing worker orchestration after removing onClosing");
  }

  #terminateLocalProcesses(): readonly RuntimeProcess[] {
    const terminatedProcesses: RuntimeProcess[] = [];
    const terminationFailure = scopeTerminated();
    this.#appendTerminatedProcess(terminatedProcesses, this.#process, terminationFailure);

    for (const process of this.#spawnedProcesses) {
      this.#appendTerminatedProcess(terminatedProcesses, process, terminationFailure);
    }

    return terminatedProcesses;
  }

  #appendTerminatedProcess(
    terminatedProcesses: RuntimeProcess[],
    process: RuntimeProcess,
    failure: Failure,
  ): void {
    process.fail(failure);
    terminatedProcesses.push(process);
  }

  #setStatus(status: RuntimeScopeStatus): void {
    this.#status = status;
  }

  static readonly #sentinel = null as unknown as RuntimeScope;

  readonly #exitFuture: RuntimeFuture<unknown>;
  readonly #ref: ScopeRef<unknown>;
  readonly #process: RuntimeProcess;
  readonly #parent: RuntimeScope;
  readonly #descriptor: ScopeDescriptor;
  readonly #zone: RuntimeZone;

  #status: RuntimeScopeStatus = "open";
  readonly #children = new Set<RuntimeScope>();

  readonly #mailboxes = new WeakMap<MessageKey<unknown>, unknown[]>();
  readonly #receiverQueues = new WeakMap<MessageKey<unknown>, RuntimeProcess[]>();

  readonly #derivedFutures = new Set<RuntimeFuture<unknown>>();
  readonly #spawnedProcesses = new Set<RuntimeProcess>();
  readonly #bindings = new Map<ContextKey<unknown>, unknown>();
}

export type RuntimeScopeStatus = "open" | "closing" | "closed";

export interface RuntimeZone {
  trackProcess(process: RuntimeProcess): void;
}

export type RuntimeZoneBuilder = (scope: RuntimeScope) => RuntimeZone;
