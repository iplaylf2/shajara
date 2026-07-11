import type { LaunchStatus, RiteRoutine } from "#/contracts/index.js";
// oxlint-disable-next-line unicorn/prefer-export-from -- These types are also used locally.
import type { RunOptions, StatefulPromise, TopLevelEntry } from "#/entry-kit/index.js";
import { CanceledError } from "#/errors/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { isLeft } from "@shajara/kernel/utils";
import { launchEntry, launchTopLevelEntry } from "#/entry-kit/index.js";
import { park } from "@shajara/kernel";

/**
 * Creates a long-lived scope for launching related routines.
 *
 * An open managed scope keeps a Node.js process from exiting naturally. Cancel or
 * asynchronously dispose the scope during application shutdown.
 *
 * @returns Scope that owns routines launched through it.
 */
export function createScope(): Scope {
  const entry = launchTopLevelEntry(encodeRitual(park));
  return new ManagedScope(entry);
}

/** Long-lived scope for launching and canceling related routines. */
export interface Scope {
  /**
   * Starts a routine owned by this scope.
   * Non-cancellation failures from the launched routine propagate to this scope.
   * Cancellation remains local to the launched routine.
   *
   * @returns Stateful promise for the launched routine result and lifecycle state.
   * @throws Error when this scope is already closed.
   */
  run<Return>(routine: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return>;

  /**
   * Requests cancellation and waits for this scope to close.
   * Expected cancellation resolves.
   *
   * @returns Promise that resolves after expected cancellation or rejects when the scope
   * closes with a non-cancellation failure.
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
  public constructor(entry: TopLevelEntry<never>) {
    this.executor = entry.executor;
    this.#entry = entry;
    this.#closed = Promise.resolve(this.#entry.settled);
  }

  public run<Return>(routine: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return> {
    const entry = launchEntry(this.executor, this.#entry.scope, routine, options);
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

  readonly #entry: TopLevelEntry<never>;
  readonly #closed: Promise<void>;
  private readonly executor: TopLevelEntry<never>["executor"];
}
