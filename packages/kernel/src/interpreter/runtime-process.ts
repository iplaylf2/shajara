// oxlint-disable class-methods-use-this
import type {
  FutureKey,
  FutureResult,
  FutureSettleKey,
  MessageKey,
  ProcessRef,
  Ritual,
  ScopeRef,
  Wisp,
} from "#src/contracts";
import type { Option } from "#src/utils";
import type { SelfHandle } from "#src/sigils";
import { notImplemented } from "#src/internal/not-implemented";
import { right } from "#src/utils";

export class RuntimeProcess<Relic = unknown> {
  public constructor(
    scopeRef: ScopeRef<unknown>,
    exitFuture: FutureKey<Relic>,
    config: RuntimeProcessConfig<Relic>,
  ) {
    this.participation = config.participation;
    this.ref = { exitFuture } as ProcessRef<Relic>;
    this.scopeRef = scopeRef;
    this.wisp = config.ritual() as Wisp<unknown>;
  }

  public get hasQueuedContinuation(): boolean {
    return this.continuation !== null;
  }

  public selfHandle(): SelfHandle<ScopeRef<unknown>> {
    return {
      processRef: this.ref,
      scopeRef: this.scopeRef,
    };
  }

  public setContinuation(resonate: (echo: unknown) => Wisp<unknown>, echo: unknown): void {
    this.continuation = {
      echo,
      kind: "resonate",
      resonate,
    };
  }

  public resonate(): void {
    const continuation = this.continuation!;

    this.continuation = null;
    this.wisp = continuation.resonate(continuation.echo);

    if (this.wisp.bearing === "resting") {
      this.#complete(this.wisp.relic);
    }
  }

  public wait(future: FutureKey<unknown>): void {
    this.blocker = {
      continuation: null,
      future,
      kind: "future",
    };
    this.status = "waiting";
    notImplemented("RuntimeProcess.wait");
  }

  public receive(_messageKey: MessageKey<unknown>): void {
    this.blocker = {
      continuation: null,
      future: null,
      kind: "receive",
    };
    this.status = "waiting";
    notImplemented("RuntimeProcess.receive");
  }

  public tryReceive<Value>(_messageKey: MessageKey<Value>): Option<Value> {
    return notImplemented("RuntimeProcess.tryReceive");
  }

  public poll<Result>(_future: FutureKey<Result>): Option<FutureResult<Result>> {
    return notImplemented("RuntimeProcess.poll");
  }

  public settle<Result>(
    _futureSettle: FutureSettleKey<Result>,
    _result: FutureResult<Result>,
  ): void {
    notImplemented("RuntimeProcess.settle");
  }

  public primeContinuation(continuation: (echo: unknown) => Wisp<unknown>): void {
    this.blocker!.continuation = continuation;
  }

  public unblock(echo: unknown): void {
    if (this.blocker === null || this.blocker.continuation === null) {
      return;
    }

    this.setContinuation(this.blocker.continuation, echo);
    this.blocker = null;
    this.status = "runnable";
  }

  #complete(value: unknown): void {
    if (this.status === "completed") {
      return;
    }

    this.blocker = null;
    this.continuation = null;
    this.result = right(value) as FutureResult<Relic>;
    this.status = "completed";
  }

  public readonly participation: "tracked" | "auxiliary";
  public readonly ref: ProcessRef<Relic>;
  public readonly scopeRef: ScopeRef<unknown>;
  public blocker: RuntimeBlocker | null = null;
  public continuation: RuntimeContinuation | null = null;
  public result: FutureResult<Relic> | null = null;
  public status: "runnable" | "waiting" | "completed" = "runnable";
  public wisp: Wisp<unknown>;
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
