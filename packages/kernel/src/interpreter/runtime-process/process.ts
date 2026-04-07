import type { CleanupTask, ProcessClosure, RuntimeProcessKeeper } from "./keeper";
import type { FutureKey, FutureResult, ProcessRef, REF_TOKEN, Ritual, ScopeRef } from "#/contracts";
import type { ProcessDescriptor, SelfHandle, Sigil } from "#/sigils";
import type {
  RuntimeProcessNextEcho,
  RuntimeProcessRunner,
  RuntimeProcessRunnerNext,
} from "./runner";
import type { Failure } from "#/failures";
import { RuntimeFuture } from "#/interpreter/runtime-future";
import type { RuntimeProcessHandle } from "./handle";
import { Stepper } from "./stepper";
import type { TaggedUnion } from "type-fest";
import { canceledFailure } from "#/failures";
import { either } from "fp-ts";

export class RuntimeProcess<Relic>
  implements RuntimeProcessHandle<Relic>, RuntimeProcessRunner<Relic>, RuntimeProcessKeeper
{
  public static create<Relic>(
    scopeRef: ScopeRef<unknown>,
    worker: Ritual<Relic>,
    descriptor: ProcessDescriptor,
  ): RuntimeProcessHandle<Relic> {
    return new RuntimeProcess(scopeRef, worker, descriptor);
  }

  public selfHandle(): SelfHandle<ScopeRef<unknown>> {
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
    runner.accept(input);
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

    return this.#settleClosed(either.left(canceledFailure));
  }

  public defer(cleanup: CleanupTask): void {
    this.#cleanups.push(cleanup);
  }

  public get exitFuture(): FutureKey<Relic> {
    return this.#exitFuture;
  }

  public get descriptor(): ProcessDescriptor {
    return this.#descriptor;
  }

  public get status(): RuntimeProcessStatus {
    return this.#state.status;
  }

  public get isClosed(): boolean {
    switch (this.status) {
      case "running":
      case "waiting":
        return false;
      case "completed":
      case "canceled":
      case "failed":
        return true;
    }
  }

  // oxlint-disable-next-line no-undef
  declare public readonly [REF_TOKEN]: ProcessRef<Relic>[typeof REF_TOKEN];
  public readonly scopeRef: ScopeRef<unknown>;

  private constructor(
    scopeRef: ScopeRef<unknown>,
    worker: Ritual<Relic>,
    descriptor: ProcessDescriptor,
  ) {
    this.scopeRef = scopeRef;
    this.#descriptor = descriptor;
    this.#state = createRunningState(new Stepper(worker));
  }

  #settleClosed(result: FutureResult<Relic>): ProcessClosure {
    const cleanups = this.#cleanups;
    this.#cleanups = [];

    return {
      cleanups,
      notification: this.#exitFuture.settle(result),
    };
  }

  #disposeWhileWaiting(): void {
    if (this.#state.status === "waiting") {
      this.#state.dispose();
    }
  }

  readonly #exitFuture = new RuntimeFuture<Relic>();
  readonly #descriptor: ProcessDescriptor;
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
      next(): RuntimeProcessRunnerNext<Relic>;
      readonly stepper: Stepper<Relic>;
    };
    waiting: {
      dispose(): void;
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
