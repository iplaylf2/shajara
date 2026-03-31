import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { left, right } from "@shajara/kernel/utils";
import { ensureExecutor } from "#/ensure-executor";
import { future } from "#/primitives";
import { toFailure } from "#/boundary";

export function* action<Return>(): RiteCoroutine<Action<Return>> {
  const [actionFuture, actionSettle] = yield* future<Return>();
  const executor = ensureExecutor();

  return {
    future: actionFuture,
    reject(reason: Error): void {
      executor.settle(actionSettle, left(toFailure(reason)));
    },
    resolve(value: Return): void {
      executor.settle(actionSettle, right(value));
    },
  };
}

export interface Action<Return> {
  readonly future: RiteFuture<Return>;
  resolve(value: Return): void;
  reject(reason: Error): void;
}
