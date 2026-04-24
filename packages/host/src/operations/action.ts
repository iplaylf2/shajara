import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { left, right } from "@shajara/kernel/utils";
import { ensureExecutor } from "#/executor";
import { future } from "#/primitives/index";
import { toFailure } from "#/boundary";

export function* action<Return>(): RiteCoroutine<Action<Return>> {
  const executor = ensureExecutor();
  const [actionFuture, actionSettle] = yield* future<Return>();

  return {
    future: actionFuture,
    reject(reason) {
      executor.settle(actionSettle, left(toFailure(reason)));
    },
    resolve(value) {
      executor.settle(actionSettle, right(value));
    },
  };
}

export interface Action<Return> {
  readonly future: RiteFuture<Return>;
  resolve(value: Return): void;
  reject(reason: Error): void;
}
