// oxlint-disable class-methods-use-this
import type {
  Echo,
  FutureKey,
  FutureResult,
  MessageKey,
  ProcessDescriptor,
  ProcessRef,
  REF_TOKEN,
  Resonance,
  Ritual,
  ScopeRef,
  SigilShape,
  Wisp,
} from "#/contracts";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "./runtime-future";
import type { SelfHandle } from "#/sigils";
import type { Unsubscribe } from "#/interpreter-kit";
import { notImplemented } from "#/internal/not-implemented";

export class RuntimeProcess<Relic> implements ProcessRef<Relic> {
  public constructor(
    scopeRef: ScopeRef<unknown>,
    worker: Ritual<Relic>,
    descriptor: ProcessDescriptor,
  ) {
    this.#exitFuture = new RuntimeFuture<Relic>();
    this.#descriptor = descriptor;
    this.scopeRef = scopeRef;
    this.#status = "running";
    this.wisp = worker() as Wisp<unknown>;
  }

  public get exitFuture(): FutureKey<Relic> {
    return this.#exitFuture;
  }

  public get descriptor(): ProcessDescriptor {
    return this.#descriptor;
  }

  public get hasQueuedContinuation(): boolean {
    return this.#continuation !== null;
  }

  public get status(): RuntimeProcessStatus {
    return this.#status;
  }

  public get isClosed(): boolean {
    switch (this.#status) {
      case "running":
      case "waiting":
        return false;
      case "completed":
      case "canceled":
      case "failed":
        return true;
    }
  }

  public selfHandle(): SelfHandle<ScopeRef<unknown>> {
    return {
      process: this,
      scope: this.scopeRef,
    };
  }

  public observe(observer: RuntimeProcessObserver): Unsubscribe {
    this.#observers.add(observer);

    return () => {
      this.#observers.delete(observer);
    };
  }

  public setContinuation<SigilItem extends SigilShape>(
    resonate: Resonance<SigilItem, unknown>,
    echo: Echo<SigilItem>,
  ): void {
    this.#continuation = {
      echo,
      resonate,
    };
  }

  public resonate(): void {
    const continuation = this.#continuation!;

    this.#continuation = null;
    this.wisp = continuation.resonate(continuation.echo);

    if (this.wisp.bearing === "resting") {
      notImplemented("RuntimeProcess.resonate resting completion");
    }
  }

  public wait(_future: RuntimeFuture<unknown>): void {
    notImplemented("RuntimeProcess.wait");
  }

  public receive(_messageKey: MessageKey<unknown>): void {
    notImplemented("RuntimeProcess.receive");
  }

  public defer(cleanup: CleanupTask): void {
    this.#cleanups.push(cleanup);
  }

  public takeCleanups(): CleanupTask[] {
    return this.#cleanups;
  }

  public accept(_value: unknown): void {
    notImplemented("RuntimeProcess.accept");
  }

  public primeContinuation(_continuation: (echo: unknown) => Wisp<unknown>): void {
    notImplemented("RuntimeProcess.primeContinuation");
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
  public result: FutureResult<Relic> | null = null;
  public wisp: Wisp<unknown>;

  #continuation: RuntimeContinuation | null = null;
  #status: RuntimeProcessStatus;
  readonly #descriptor: ProcessDescriptor;
  readonly #exitFuture: RuntimeFuture<Relic>;
  readonly #observers = new Set<RuntimeProcessObserver>();
  #cleanups: CleanupTask[] = [];
}

export type RuntimeProcessStatus = "running" | "waiting" | "completed" | "canceled" | "failed";

export type RuntimeProcessObserver = () => void;

export type ProcessSpawner = (worker: Ritual<void>) => RuntimeProcess<void>;

export type CleanupTask = (spawn: ProcessSpawner) => void;

export interface RuntimeContinuation {
  readonly echo: unknown;
  readonly resonate: Resonance<SigilShape, unknown>;
}
