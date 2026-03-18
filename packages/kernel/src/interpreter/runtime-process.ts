// oxlint-disable class-methods-use-this
import type {
  FutureKey,
  FutureResult,
  MessageKey,
  ProcessRef,
  Ritual,
  ScopeRef,
  Wisp,
} from "#src/contracts";
import type { RuntimeFuture } from "./runtime-future";
import type { SelfHandle } from "#src/sigils";
import { notImplemented } from "#src/internal/not-implemented";
import { right } from "#src/utils";

const HANDLE_FUTURE_KEY_INDEX = 0;

export class RuntimeProcess<Relic = unknown> {
  public constructor(
    scopeRef: ScopeRef<unknown>,
    exitFuture: RuntimeFuture<Relic>,
    config: RuntimeProcessConfig<Relic>,
  ) {
    this.#exitFuture = exitFuture;
    this.ref = { exitFuture: exitFuture.handle[HANDLE_FUTURE_KEY_INDEX] } as ProcessRef<Relic>;
    this.scopeRef = scopeRef;
    this.wisp = config.ritual() as Wisp<unknown>;
  }

  public get exitFuture(): RuntimeFuture<Relic> {
    return this.#exitFuture;
  }

  public get hasQueuedContinuation(): boolean {
    return this.#continuation !== null;
  }

  public selfHandle(): SelfHandle<ScopeRef<unknown>> {
    return {
      processRef: this.ref,
      scopeRef: this.scopeRef,
    };
  }

  public setContinuation(resonate: (echo: unknown) => Wisp<unknown>, echo: unknown): void {
    this.#continuation = {
      echo,
      kind: "resonate",
      resonate,
    };
  }

  public resonate(): void {
    const continuation = this.#continuation!;

    this.#continuation = null;
    this.wisp = continuation.resonate(continuation.echo);

    if (this.wisp.bearing === "resting") {
      this.#complete(this.wisp.relic);
    }
  }

  public wait(future: FutureKey<unknown>): void {
    this.#blocker = {
      continuation: null,
      future,
      kind: "future",
    };
    this.status = "waiting";
    notImplemented("RuntimeProcess.wait");
  }

  public receive(_messageKey: MessageKey<unknown>): void {
    this.#blocker = {
      continuation: null,
      future: null,
      kind: "receive",
    };
    this.status = "waiting";
    notImplemented("RuntimeProcess.receive");
  }

  public primeContinuation(continuation: (echo: unknown) => Wisp<unknown>): void {
    this.#blocker!.continuation = continuation;
  }

  #complete(value: unknown): void {
    if (this.status === "completed") {
      return;
    }

    this.#blocker = null;
    this.#continuation = null;
    this.result = right(value) as FutureResult<Relic>;
    this.status = "completed";
  }

  public readonly ref: ProcessRef<Relic>;
  public readonly scopeRef: ScopeRef<unknown>;
  public result: FutureResult<Relic> | null = null;
  public status: "runnable" | "waiting" | "completed" = "runnable";
  public wisp: Wisp<unknown>;

  #blocker: RuntimeBlocker | null = null;
  #continuation: RuntimeContinuation | null = null;
  readonly #exitFuture: RuntimeFuture<Relic>;
}

export interface RuntimeBlocker {
  continuation: ((echo: unknown) => Wisp<unknown>) | null;
  future: FutureKey<unknown> | null;
  readonly kind: "future" | "receive";
}

export interface RuntimeContinuation {
  readonly echo: unknown;
  readonly kind: "resonate";
  readonly resonate: (echo: unknown) => Wisp<unknown>;
}

export interface RuntimeProcessConfig<Relic> {
  readonly participation: "tracked" | "auxiliary";
  readonly ritual: Ritual<Relic>;
}
