import type { FutureResult, FutureSettleKey, Ritual } from "#/contracts";
import type { ExecutionScopeRef } from "./execution-scope";
import type { LaunchHandle } from "./launch-handle";
import type { Pacer } from "./pacer";
import { notImplemented } from "#/internal/not-implemented";

export function createExecutor(pacer: Pacer): Executor {
  return new RuntimeExecutor(pacer);
}

export interface Executor {
  readonly rootScope: ExecutionScopeRef<unknown>;
  launch<Result>(scope: ExecutionScopeRef<unknown>, ritual: Ritual<Result>): LaunchHandle<Result>;
  settle<Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>): void;
  cancel(scope: ExecutionScopeRef<unknown>): void;
}

class RuntimeExecutor implements Executor {
  public launch<Result>(
    _scope: ExecutionScopeRef<unknown>,
    _ritual: Ritual<Result>,
  ): LaunchHandle<Result> {
    return notImplemented("");
  }
  public settle<Result>(
    _futureSettle: FutureSettleKey<Result>,
    _result: FutureResult<Result>,
  ): void {
    return notImplemented("");
  }
  public cancel(_scope: ExecutionScopeRef<unknown>): void {
    return notImplemented("");
  }

  public constructor(_pacer: Pacer) {
    notImplemented("");
  }

  public get rootScope(): ExecutionScopeRef<unknown> {
    return notImplemented("");
  }
}
