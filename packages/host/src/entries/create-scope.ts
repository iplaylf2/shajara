import type { ExecutionScopeRef, Executor } from "@shajara/kernel";
import type { LaunchStatus, RiteRoutine } from "#/contracts";
import type { LaunchedEntry, RunOptions, StatefulPromise } from "#/entry-kit";
import { encodeRitual } from "#/boundary/index";
import { ensureExecutor } from "#/executor";
import { launchEntry } from "#/entry-kit";
import { park } from "@shajara/kernel";

export function createScope(): Scope {
  const executor = ensureExecutor();

  return new HostScope(executor, executor.scope);
}

export interface Scope {
  run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return>;
  cancel(): Promise<void>;
  readonly status: ScopeStatus;
  readonly closed: Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type ScopeStatus = LaunchStatus;

export type { RunOptions, StatefulPromise };

class HostScope implements Scope {
  public constructor(
    private readonly executor: Executor,
    scope: ExecutionScopeRef<unknown>,
  ) {
    this.#entry = launchEntry(this.executor, scope, encodeRitual(park));
    this.#closed = Promise.resolve(this.#entry.settled);
  }

  public run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return> {
    return launchEntry(this.executor, this.#entry.scope, ritual, options).settled;
  }

  public async cancel(): Promise<void> {
    if (this.#entry.settled.status === "open") {
      this.executor.cancel(this.#entry.scope);
    }

    await this.#closed;
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
