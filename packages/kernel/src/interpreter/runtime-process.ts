// oxlint-disable class-methods-use-this
import type {
  FailureShape,
  FutureKey,
  FutureResult,
  MessageKey,
  ProcessRef,
  Ritual,
  ScopeRef,
  Wisp,
} from "#src/contracts";
import { left, right } from "#src/utils";
import { RuntimeFuture } from "./runtime-future";
import type { SelfHandle } from "#src/sigils";
import { notImplemented } from "#src/internal/not-implemented";

const HANDLE_FUTURE_KEY_INDEX = 0;

export class RuntimeProcess<Relic = unknown> {
  public constructor(
    scopeRef: ScopeRef<unknown>,
    ritual: Ritual<Relic>,
    participation: "tracked" | "auxiliary",
  ) {
    this.#exitFuture = RuntimeFuture.create<Relic>();
    this.#participation = participation;
    this.ref = {
      exitFuture: this.#exitFuture.handle[HANDLE_FUTURE_KEY_INDEX],
    } as ProcessRef<Relic>;
    this.scopeRef = scopeRef;
    this.wisp = ritual() as Wisp<unknown>;
  }

  public get exitFuture(): RuntimeFuture<Relic> {
    return this.#exitFuture;
  }

  public get participation(): "tracked" | "auxiliary" {
    return this.#participation;
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

  public fail(failure: FailureShape): void {
    this.#finish(left(failure) as FutureResult<Relic>);
  }

  #complete(value: unknown): void {
    this.#finish(right(value) as FutureResult<Relic>);
  }

  #finish(result: FutureResult<Relic>): void {
    if (this.status === "completed") {
      return;
    }

    this.#blocker = null;
    this.#continuation = null;
    this.result = result;
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
  readonly #participation: "tracked" | "auxiliary";
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
