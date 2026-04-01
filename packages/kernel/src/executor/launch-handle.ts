import type { ExecutionScopeRef } from "./execution-scope";
import type { Failure } from "#/failures";
import type { Interpreter } from "#/interpreter";
import type { TaggedUnion } from "type-fest";
import type { Unsubscribe } from "#/utils";
import { canceledFailure } from "#/failures";
import { either } from "fp-ts";

export class RuntimeLaunchHandle<Result> implements LaunchHandle<Result> {
  public onSettled(listener: (result: LaunchResult<Result>) => void): Unsubscribe {
    return this.interpreter.wait(this.executionScope.exitFuture, (result) => {
      if (either.isLeft(result)) {
        if (result.left === canceledFailure) {
          listener({ kind: "canceled" });
        } else {
          listener({ failure: result.left as Failure, kind: "failure" });
        }
      } else {
        listener({ kind: "success", result: result.right });
      }
    });
  }

  public constructor(
    private readonly interpreter: Interpreter,
    private readonly executionScope: ExecutionScopeRef<Result>,
  ) {}

  public get scope(): ExecutionScopeRef<Result> {
    return this.executionScope;
  }
  public get status(): LaunchStatus {
    return this.interpreter.scopeStatus(this.executionScope);
  }
}

export interface LaunchHandle<Result> {
  onSettled(listener: (result: LaunchResult<Result>) => void): Unsubscribe;

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
