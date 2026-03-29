// oxlint-disable class-methods-use-this
import type {
  CleanupTask,
  RuntimeProcessKeeper,
  RuntimeProcessKeeperStateOf,
  RuntimeProcessKeeperStatus,
} from "./keeper";
import type { FutureKey, MessageKey, ProcessRef, REF_TOKEN, Ritual, ScopeRef } from "#/contracts";
import type { ProcessDescriptor, SelfHandle } from "#/sigils";
import type {
  RuntimeProcessRunner,
  RuntimeProcessRunnerStateOf,
  RuntimeProcessRunnerStatus,
} from "./runner";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "#/interpreter/runtime-future";
import type { RuntimeProcessHandle } from "./handle";
import { notImplemented } from "#/internal/not-implemented";

export class RuntimeProcess<Relic>
  implements RuntimeProcessHandle<Relic>, RuntimeProcessRunner<Relic>, RuntimeProcessKeeper
{
  public static create<Relic>(
    scopeRef: ScopeRef<unknown>,
    worker: Ritual<Relic>,
    descriptor: ProcessDescriptor,
  ): RuntimeProcessHandle<Relic> {
    return new RuntimeProcess(scopeRef, worker, descriptor);
  }

  private constructor(
    scopeRef: ScopeRef<unknown>,
    _worker: Ritual<Relic>,
    _descriptor: ProcessDescriptor,
  ) {
    this.scopeRef = scopeRef;
    notImplemented("RuntimeProcess.constructor");
  }

  public get exitFuture(): FutureKey<Relic> {
    return notImplemented("RuntimeProcess.exitFuture");
  }

  public get descriptor(): ProcessDescriptor {
    return notImplemented("RuntimeProcess.descriptor");
  }

  public get status(): RuntimeProcessStatus {
    return notImplemented("RuntimeProcess.status");
  }

  public get isClosed(): boolean {
    return notImplemented("RuntimeProcess.isClosed");
  }

  public selfHandle(): SelfHandle<ScopeRef<unknown>> {
    return {
      process: this,
      scope: this.scopeRef,
    };
  }

  public runner(): RuntimeProcessRunner<Relic> {
    return this;
  }

  public keeper(): RuntimeProcessKeeper {
    return this;
  }

  public stateAs<Status extends RuntimeProcessStatus>(
    _status: Status,
  ): RuntimeProcessStateOf<Relic, Status> {
    return notImplemented("RuntimeProcess.stateAs");
  }

  public receive(_messageKey: MessageKey<unknown>): void {
    notImplemented("RuntimeProcess.receive");
  }

  public defer(cleanup: CleanupTask): void {
    // oxlint-disable-next-line no-void
    void cleanup;
    notImplemented("RuntimeProcess.defer");
  }

  public takeCleanups(): CleanupTask[] {
    return notImplemented("RuntimeProcess.takeCleanups");
  }

  public accept(_value: unknown): void {
    notImplemented("RuntimeProcess.accept");
  }

  public halt(_failure: Failure): void {
    notImplemented("RuntimeProcess.halt");
  }

  public cancel(): void {
    notImplemented("RuntimeProcess.cancel");
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [REF_TOKEN]: ProcessRef<Relic>[typeof REF_TOKEN];
  public readonly scopeRef: ScopeRef<unknown>;
}

type RuntimeProcessStateOf<
  Relic,
  Status extends RuntimeProcessStatus,
> = RuntimeProcessKeeperStateOf<Status> & RuntimeProcessRunnerStateOf<Relic, Status>;
type RuntimeProcessStatus = RuntimeProcessKeeperStatus & RuntimeProcessRunnerStatus;
