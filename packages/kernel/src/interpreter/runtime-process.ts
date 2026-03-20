// oxlint-disable class-methods-use-this
import type {
  FailureShape,
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
import { RuntimeFuture } from "./runtime-future";
import type { SelfHandle } from "#src/sigils";
import { notImplemented } from "#src/internal/not-implemented";

const HANDLE_FUTURE_KEY_INDEX = 0;

export class RuntimeProcess<Relic = unknown> {
  public constructor(
    scopeRef: ScopeRef<unknown>,
    ritual: Ritual<Relic>,
    descriptor: ProcessDescriptor,
    cellBuilder: RuntimeCellBuilder,
  ) {
    this.#exitFuture = RuntimeFuture.create<Relic>();
    this.#descriptor = descriptor;
    this.ref = {
      exitFuture: this.#exitFuture.handle[HANDLE_FUTURE_KEY_INDEX],
    } as ProcessRef<Relic>;
    this.scopeRef = scopeRef;
    this.status = "runnable";
    this.#cell = cellBuilder(this);
    this.wisp = ritual() as Wisp<unknown>;
    this.#cell.track();
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

  public selfHandle(): SelfHandle<ScopeRef<unknown>> {
    return {
      processRef: this.ref,
      scopeRef: this.scopeRef,
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

  public fail(_failure: FailureShape): void {
    notImplemented("RuntimeProcess.fail");
  }

  public readonly ref: ProcessRef<Relic>;
  public readonly scopeRef: ScopeRef<unknown>;
  public result: FutureResult<Relic> | null = null;
  public status: RuntimeProcessStatus;
  public wisp: Wisp<unknown>;

  #continuation: RuntimeContinuation | null = null;
  readonly #cell: RuntimeCell;
  readonly #descriptor: ProcessDescriptor;
  readonly #exitFuture: RuntimeFuture<Relic>;
}

export interface RuntimeCell {
  track(): void;
}

export type RuntimeCellBuilder = (process: RuntimeProcess) => RuntimeCell;

export type RuntimeProcessStatus = "runnable" | "waiting" | "completed";

export interface RuntimeContinuation {
  readonly echo: unknown;
  readonly resonate: Resonance<SigilShape, unknown>;
}
