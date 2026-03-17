import type { BranchHandle, SelfHandle } from "#src/sigils";
import type {
  FailureShape,
  FutureResult,
  ProcessRef,
  Ritual,
  ScopeRef,
  Wisp,
} from "#src/contracts";
import { left, right } from "#src/utils";
import type { RuntimeFuture } from "./runtime-scope";

export class RuntimeProcess<Relic = unknown> {
  public constructor(config: RuntimeProcessConfig<Relic>) {
    this.exitFuture = config.exitFuture;
    this.#onExited = config.onExited;
    this.participation = config.participation;
    this.ref = config.ref;
    this.scopeRef = config.scopeRef;
    this.wisp = config.ritual() as Wisp<unknown>;
  }

  public get hasQueuedContinuation(): boolean {
    return this.continuation !== null;
  }

  public branchHandle(): BranchHandle<Relic> {
    return {
      processRef: this.ref,
      scopeRef: this.scopeRef as ScopeRef<Relic>,
    };
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
      this.complete(this.wisp.relic);
    }
  }

  public wait(future: RuntimeFuture): void {
    this.blocker = {
      continuation: null,
      future,
      kind: "future",
    };
    this.status = "waiting";
    future.waitingProcesses.add(this);
  }

  public receive(): void {
    this.blocker = {
      continuation: null,
      future: null,
      kind: "receive",
    };
    this.status = "waiting";
  }

  public primeContinuation(continuation: (echo: unknown) => Wisp<unknown>): void {
    this.blocker!.continuation = continuation;
  }

  public unblock(echo: unknown): void {
    if (this.blocker === null || this.blocker.continuation === null) {
      return;
    }

    this.setContinuation(this.blocker.continuation, echo);
    this.blocker.future?.waitingProcesses.delete(this);
    this.blocker = null;
    this.status = "runnable";
  }

  public complete(value: unknown): void {
    if (this.status === "completed") {
      return;
    }

    this.blocker = null;
    this.continuation = null;
    this.result = right(value) as FutureResult<Relic>;
    this.status = "completed";
    this.#onExited(this);
  }

  public fail(failure: FailureShape): void {
    if (this.status === "completed") {
      return;
    }

    this.blocker = null;
    this.continuation = null;
    this.result = left(failure) as FutureResult<Relic>;
    this.status = "completed";
    this.#onExited(this);
  }

  public readonly exitFuture: RuntimeFuture;
  public readonly participation: "tracked" | "auxiliary";
  public readonly ref: ProcessRef<Relic>;
  public readonly scopeRef: ScopeRef<unknown>;
  public blocker: RuntimeBlocker | null = null;
  public continuation: RuntimeContinuation | null = null;
  public result: FutureResult<Relic> | null = null;
  public status: "runnable" | "waiting" | "completed" = "runnable";
  public wisp: Wisp<unknown>;

  readonly #onExited: (process: RuntimeProcess) => void;
}

export interface RuntimeBlocker {
  continuation: ((echo: unknown) => Wisp<unknown>) | null;
  future: RuntimeFuture | null;
  readonly kind: "future" | "receive";
}

export interface RuntimeContinuation {
  readonly echo: unknown;
  readonly kind: "resonate";
  readonly resonate: (echo: unknown) => Wisp<unknown>;
}

export interface RuntimeProcessConfig<Relic> {
  readonly exitFuture: RuntimeFuture;
  readonly onExited: (process: RuntimeProcess) => void;
  readonly participation: "tracked" | "auxiliary";
  readonly ref: ProcessRef<Relic>;
  readonly ritual: Ritual<Relic>;
  readonly scopeRef: ScopeRef<unknown>;
}
