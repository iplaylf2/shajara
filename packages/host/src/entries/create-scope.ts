import type { EntryLaunchServices, RunOptions, StatefulPromise } from "#/entry-kit";
import type { LaunchStatus, RiteRoutine } from "#/contracts";
import { EntryLaunch } from "#/entry-kit";
import type { ExecutionScopeRef } from "@shajara/kernel";
import { encodeRitual } from "#/boundary/index";
import { ensureExecutor } from "#/executor";
import { park } from "@shajara/kernel";

export function createScope(): Scope {
  const executor = ensureExecutor();
  const services: EntryLaunchServices = {
    cancelScope: (scope) => executor.cancel(scope),
    launchInScope: (scope, ritual) => executor.launch(scope, ritual),
  };

  return new HostScope(executor.scope, services);
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
    scope: ExecutionScopeRef<unknown>,
    private readonly services: EntryLaunchServices,
  ) {
    this.#launch = EntryLaunch.create(scope, encodeRitual(park), this.services);
    this.#closed = Promise.resolve(this.#launch.settled);
  }

  public run<Return>(ritual: RiteRoutine<Return>, options?: RunOptions): StatefulPromise<Return> {
    return EntryLaunch.create(this.#launch.scope, ritual, this.services, options).settled;
  }

  public async cancel(): Promise<void> {
    if (this.#launch.settled.status === "open") {
      this.services.cancelScope(this.#launch.scope);
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
    return this.#launch.settled.status;
  }

  readonly #launch: EntryLaunch<never>;
  readonly #closed: Promise<void>;
}
