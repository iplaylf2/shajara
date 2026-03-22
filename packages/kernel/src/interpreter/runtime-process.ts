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
} from "#src/contracts";
import type { Failure } from "#src/failures";
import { RuntimeFuture } from "./runtime-future";
import type { SelfHandle } from "#src/sigils";
import type { Unsubscribe } from "#src/interpreter-kit";
import { notImplemented } from "#src/internal/not-implemented";

const HANDLE_FUTURE_KEY_INDEX = 0;

export class RuntimeProcess<Relic = unknown> {
  public constructor(
    scopeRef: ScopeRef<unknown>,
    ritual: Ritual<Relic>,
    descriptor: ProcessDescriptor,
  ) {
    this.#exitFuture = RuntimeFuture.create<Relic>();
    this.#descriptor = descriptor;
    this.ref = {
      exitFuture: this.#exitFuture.handle[HANDLE_FUTURE_KEY_INDEX],
    } as ProcessRef<Relic>;
    this.scopeRef = scopeRef;
    this.#status = "running";
    this.wisp = ritual() as Wisp<unknown>;
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

  public accept(_value: unknown): void {
    notImplemented("RuntimeProcess.accept");
  }

  public primeContinuation(_continuation: (echo: unknown) => Wisp<unknown>): void {
    notImplemented("RuntimeProcess.primeContinuation");
  }

  public halt(_failure: Failure): void {
    notImplemented("RuntimeProcess.halt");
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
}

export type RuntimeProcessStatus = "running" | "waiting" | "completed" | "failed" | "canceled";

export type RuntimeProcessObserver = () => void;

export interface RuntimeContinuation {
  readonly echo: unknown;
  readonly resonate: Resonance<SigilShape, unknown>;
}
