import type { Disposer } from "#/utils";
import type { ExecutionScopeRef } from "./execution-scope";
import type { Failure } from "#/failures";
import type { ScopeRef } from "#/contracts";
import type { TaggedUnion } from "type-fest";

export class RuntimeLaunchHandle<Result> implements LaunchHandle<Result> {
  public onSettled(listener: (result: LaunchResult<Result>) => void): Disposer {
    return this.lifecycle.onSettled(this.executionScope, listener);
  }

  public constructor(
    private readonly executionScope: ExecutionScopeRef<Result>,
    private readonly lifecycle: LaunchLifecycle<Result>,
  ) {}

  public get scope(): ExecutionScopeRef<Result> {
    return this.executionScope;
  }

  public get status(): LaunchStatus {
    return this.lifecycle.status(this.executionScope);
  }
}

export interface LaunchHandle<Result> {
  onSettled(listener: (result: LaunchResult<Result>) => void): Disposer;

  readonly scope: ExecutionScopeRef<Result>;
  readonly status: LaunchStatus;
}

export type LaunchResult<Result> = TaggedUnion<
  "kind",
  {
    canceled: {};
    failure: { readonly failure: Failure };
    success: { readonly result: Result };
  }
>;

export type LaunchStatus = "open" | "closing" | "closed";

export interface LaunchLifecycle<Result> {
  status(scope: ScopeRef<Result>): LaunchStatus;
  onSettled(scope: ScopeRef<Result>, listener: (result: LaunchResult<Result>) => void): Disposer;
}
