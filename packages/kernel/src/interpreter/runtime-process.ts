import type { BranchHandle, SelfHandle } from "#src/sigils";
import type {
  FailureShape,
  FutureKey,
  FutureResult,
  ProcessRef,
  Ritual,
  ScopeRef,
  Wisp,
} from "#src/contracts";
import { left, right } from "#src/utils";

export class RuntimeProcess<Relic = unknown> {
  public constructor(
    scopeRef: ScopeRef<unknown>,
    exitFuture: FutureKey<Relic>,
    ritual: Ritual<Relic>,
    participation: "tracked" | "auxiliary",
  ) {
    this.participation = participation;
    this.ref = { exitFuture } as ProcessRef<Relic>;
    this.scopeRef = scopeRef;
    this.wisp = ritual() as Wisp<unknown>;
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

  public wait(future: FutureKey<unknown>): void {
    this.blocker = {
      continuation: null,
      future,
      kind: "future",
    };
    this.status = "waiting";
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
  }

  public fail(failure: FailureShape): void {
    if (this.status === "completed") {
      return;
    }

    this.blocker = null;
    this.continuation = null;
    this.result = left(failure) as FutureResult<Relic>;
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
