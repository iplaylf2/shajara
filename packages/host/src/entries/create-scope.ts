import type { ExecutionScopeRef, Executor } from "@shajara/kernel";
import type { LaunchStatus, RiteRoutine } from "#/contracts";
import type { LaunchedEntry, RunOptions, StatefulPromise } from "#/entry-kit";
import { CanceledError } from "#/errors";
import { encodeRitual } from "#/boundary/index";
import { ensureExecutor } from "#/executor";
import { isLeft } from "@shajara/kernel/utils";
import { launchEntry } from "#/entry-kit";
import { park } from "@shajara/kernel";

/**
 * Creates a long-lived scope for launching related routines.
 *
 * @returns Scope that owns routines launched through it.
 */
export function createScope(): Scope {
  const executor = ensureExecutor();

  return new ManagedScope(executor, executor.scope);
}

/** Long-lived scope for launching and canceling related routines. */
export interface Scope {
  /**
   * Starts a routine owned by this scope.
   * Non-cancellation failures from the launched routine propagate to this scope.
   * Cancellation remains local to the launched routine.
   *
   * @returns Stateful promise that resolves with the routine result or rejects with a
   * shajara error.
   */
  run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return>;

  /**
   * Requests cancellation and waits for this scope to close.
   * Expected cancellation resolves.
   *
   * @throws Shajara error when the scope closes with a non-cancellation failure.
   */
  cancel(): Promise<void>;

  /** Current lifecycle state for this scope. */
  readonly status: ScopeStatus;

  /** Promise that settles when this scope closes. */
  readonly closed: Promise<void>;

  /** Cancels the scope when used with explicit resource management. */
  [Symbol.asyncDispose](): Promise<void>;
}

/** Lifecycle state reported by a scope. */
export type ScopeStatus = LaunchStatus;

export type { RunOptions, StatefulPromise };

class ManagedScope implements Scope {
  public constructor(
    private readonly executor: Executor,
    scope: ExecutionScopeRef<unknown>,
  ) {
    this.#entry = launchEntry(this.executor, scope, encodeRitual(park));
    this.#closed = Promise.resolve(this.#entry.settled);
  }

  public run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return> {
    const entry = launchEntry(this.executor, this.#entry.scope, ritual, options);
    this.executor.onSettled(entry.scope.exitFuture, (result) => {
      if (!isLeft(result)) {
        return;
      }

      const failure = result.left;
      if (failure.kind === "canceled") {
        return;
      }

      this.executor.halt(this.#entry.scope, failure);
    });

    return entry.settled;
  }

  public async cancel(): Promise<void> {
    if (this.#entry.settled.status === "open") {
      this.executor.cancel(this.#entry.scope);
    }

    try {
      await this.#closed;
    } catch (error) {
      if (error instanceof CanceledError) {
        return;
      }

      throw error;
    }
  }

  public [Symbol.asyncDispose](): Promise<void> {
    return this.cancel();
  }

  public get closed(): Promise<void> {
    return this.#closed;
  }

  public get status(): ScopeStatus {
    return this.#entry.settled.status;
  }

  readonly #entry: LaunchedEntry<never>;
  readonly #closed: Promise<void>;
}
