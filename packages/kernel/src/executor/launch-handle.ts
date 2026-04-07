import type { FutureKey, FutureResult, Suppressor } from "#/contracts";
import type { Disposer } from "#/utils";
import type { ExecutionScopeRef } from "./execution-scope";
import type { Failure } from "#/failures";
import type { TaggedUnion } from "type-fest";
import { canceledFailure } from "#/failures";
import { either } from "fp-ts";

export class RuntimeLaunchHandle<Result> implements LaunchHandle<Result> {
  public onSettled(listener: (result: LaunchResult<Result>) => void): Disposer {
    return this.onScopeSettled(this.executionScope.exitFuture, (result, suppressor) => {
      try {
        listener(toLaunchResult(result));
      } catch (error) {
        suppressor.capture(error);
      }
    });
  }

  public constructor(
    private readonly executionScope: ExecutionScopeRef<Result>,
    private readonly onScopeSettled: <Settled>(
      future: FutureKey<Settled>,
      onSettled: (result: FutureResult<Settled>, suppressor: Suppressor) => void,
    ) => Disposer,
    private readonly scopeStatus: (scope: ExecutionScopeRef<unknown>) => LaunchStatus,
  ) {}

  public get scope(): ExecutionScopeRef<Result> {
    return this.executionScope;
  }

  public get status(): LaunchStatus {
    return this.scopeStatus(this.executionScope);
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

function toLaunchResult<Result>(result: FutureResult<Result>): LaunchResult<Result> {
  if (either.isLeft(result)) {
    if (result.left === canceledFailure) {
      return { kind: "canceled" };
    }

    return { failure: result.left as Failure, kind: "failure" };
  }
  return { kind: "success", result: result.right };
}
