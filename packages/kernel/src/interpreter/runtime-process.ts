// oxlint-disable class-methods-use-this
import type {
  FutureKey,
  FutureResult,
  MessageKey,
  ProcessDescriptor,
  ProcessRef,
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

const HANDLE_FUTURE_KEY_INDEX = 0;

export class RuntimeProcess<Relic> {
  public constructor(
    scopeRef: ScopeRef<unknown>,
    worker: Ritual<Relic>,
    descriptor: ProcessDescriptor,
  ) {
    this.#exitFuture = new RuntimeFuture<Relic>();
    this.#descriptor = descriptor;
    this.ref = {
      exitFuture: this.#exitFuture.handle[HANDLE_FUTURE_KEY_INDEX],
    } as ProcessRef<Relic>;
    this.scopeRef = scopeRef;
    this.#status = "running";
    this.wisp = worker() as Wisp<unknown>;
  }

  public get exitFuture(): RuntimeFuture<Relic> {
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
      process: this.ref,
      scope: this.scopeRef,
    };
  }

  public observe(observer: RuntimeProcessObserver): Unsubscribe {
    this.#observers.add(observer);

    return () => {
      this.#observers.delete(observer);
    };
  }

  public setContinuation(resonate: (echo: unknown) => Wisp<unknown>, echo: unknown): void {
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

  public wait(_future: FutureKey<unknown>): void {
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

  public readonly ref: ProcessRef<Relic>;
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
