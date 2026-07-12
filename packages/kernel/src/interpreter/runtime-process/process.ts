import type { CleanupTask, ProcessClosure, RuntimeProcessKeeper } from "./keeper.js";
import type {
  FutureKey,
  FutureResult,
  ProcessDescriptor,
  ProcessRef,
  REF_TOKEN,
  Ritual,
  ScopeRef,
} from "#/contracts/index.js";
import type {
  RuntimeProcessNextEcho,
  RuntimeProcessRunner,
  RuntimeProcessRunnerNext,
} from "./runner.js";
import type { SelfHandle, Sigil } from "#/sigils/index.js";
import type { Failure } from "#/failures/index.js";
import { RuntimeFuture } from "#/interpreter/runtime-future/index.js";
import type { RuntimeProcessHandle } from "./handle.js";
import { Stepper } from "./stepper.js";
import type { TaggedUnion } from "type-fest";
import { canceledFailure } from "#/failures/index.js";
import { either } from "fp-ts";

export class RuntimeProcess<Relic>
  implements RuntimeProcessHandle<Relic>, RuntimeProcessRunner<Relic>, RuntimeProcessKeeper
{
  public static create<Relic>(
    scopeRef: ScopeRef<unknown>,
    entry: Ritual<Relic>,
    descriptor: ProcessDescriptor,
  ): RuntimeProcessHandle<Relic> {
    return new RuntimeProcess(scopeRef, entry, descriptor);
  }

  public selfHandle(): SelfHandle {
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
    return this.#state as RuntimeProcessStateOf<Relic, Status>;
  }

  public resume(input: unknown): void {
    const current = this.stateAs("waiting");
    const runner = current.stepper.current() as RuntimeProcessNextEcho<Sigil>;
    runner.accept(input as never);
    this.#state = createRunningState(current.stepper);
  }

  public wait(dispose: () => void): void {
    const current = this.stateAs("running");
    this.#state = {
      dispose,
      status: "waiting",
      stepper: current.stepper,
    };
  }

  public complete(result: unknown): ProcessClosure {
    this.#disposeWhileWaiting();
    this.#state = {
      result: result as Relic,
      status: "completed",
    };

    return this.#settleClosed(either.right(result as Relic));
  }

  public fail(failure: Failure): ProcessClosure {
    this.#disposeWhileWaiting();
    this.#state = {
      failure,
      status: "failed",
    };

    return this.#settleClosed(either.left(failure));
  }

  public cancel(): ProcessClosure {
    this.#disposeWhileWaiting();
    this.#state = {
      status: "canceled",
    };

    return this.#settleClosed(either.left(canceledFailure()));
  }

  public defer(cleanup: CleanupTask): void {
    this.#cleanups.push(cleanup);
  }

  public get exitFuture(): FutureKey<Relic> {
    return this.#exitFuture;
  }

  public get descriptor(): ProcessDescriptor {
    return this.processDescriptor;
  }

  public get scopeRef(): ScopeRef<unknown> {
    return this.scopeReference;
  }

  public get status(): RuntimeProcessStatus {
    return this.#state.status;
  }

  public get isClosed(): boolean {
    switch (this.status) {
      case "running":
      case "waiting": {
        return false;
      }
      case "completed":
      case "canceled":
      case "failed": {
        return true;
      }
    }
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [REF_TOKEN]: ProcessRef<Relic>[typeof REF_TOKEN];

  private constructor(
    private readonly scopeReference: ScopeRef<unknown>,
    entry: Ritual<Relic>,
    private readonly processDescriptor: ProcessDescriptor,
  ) {
    this.#state = createRunningState(new Stepper(entry));
  }

  #settleClosed(result: FutureResult<Relic>): ProcessClosure {
    const cleanups = this.#cleanups;
    this.#cleanups = [];

    return {
      cleanups,
      settlement: this.#exitFuture.settle(result),
    };
  }

  #disposeWhileWaiting(): void {
    if (this.#state.status === "waiting") {
      this.#state.dispose();
    }
  }

  readonly #exitFuture = new RuntimeFuture<Relic>();
  #cleanups: CleanupTask[] = [];
  #state: RuntimeProcessState<Relic>;
}

type RuntimeProcessStateOf<Relic, Status extends RuntimeProcessStatus> = Extract<
  RuntimeProcessState<Relic>,
  { readonly status: Status }
>;

type RuntimeProcessStatus = RuntimeProcessState<unknown>["status"];

type RuntimeProcessState<Relic> = TaggedUnion<
  "status",
  {
    canceled: {};
    completed: { readonly result: Relic };
    failed: { readonly failure: Failure };
    running: {
      next: () => RuntimeProcessRunnerNext<Relic>;
      readonly stepper: Stepper<Relic>;
    };
    waiting: {
      dispose: () => void;
      readonly stepper: Stepper<Relic>;
    };
  }
>;

function createRunningState<Relic>(
  stepper: Stepper<Relic>,
): Extract<RuntimeProcessState<Relic>, { readonly status: "running" }> {
  return {
    next: () => stepper.next(),
    status: "running",
    stepper,
  };
}
