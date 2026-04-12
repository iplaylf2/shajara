import type { FutureResult, FutureSettleKey } from "@shajara/kernel";
import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { left, right } from "@shajara/kernel/utils";
import { ensureExecutor } from "#/executor";
import { future } from "#/primitives";
import { toFailure } from "#/boundary";

export function* action<Return>(): RiteCoroutine<Action<Return>> {
  const [actionFuture, actionSettle] = yield* future<Return>();
  const executor = ensureExecutor();
  return new RuntimeAction(actionFuture, actionSettle, (futureSettle, result) =>
    executor.settle(futureSettle, result),
  );
}

export interface Action<Return> {
  readonly future: RiteFuture<Return>;
  resolve(value: Return): void;
  reject(reason: Error): void;
}

class RuntimeAction<Return> implements Action<Return> {
  public constructor(
    private readonly futureRef: RiteFuture<Return>,
    private readonly actionSettle: FutureSettleKey<Return>,
    private readonly settleFuture: FutureSettler,
  ) {}

  public reject(reason: Error): void {
    this.settleFuture(this.actionSettle, left(toFailure(reason)));
  }

  public resolve(value: Return): void {
    this.settleFuture(this.actionSettle, right(value));
  }

  public get future(): RiteFuture<Return> {
    return this.futureRef;
  }
}

type FutureSettler = <Result>(
  futureSettle: FutureSettleKey<Result>,
  result: FutureResult<Result>,
) => boolean;
