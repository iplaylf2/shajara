import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { left, right } from "@shajara/kernel/utils";
import { ensureExecutor } from "@shajara/kernel";
import { future } from "#src/primitives";
import { toFailure } from "#src/boundary";

export function* action<Return>(): RiteCoroutine<Action<Return>> {
  const [settlementFuture, settlementResolverKey] = yield* future<Return>();
  const executor = ensureExecutor();

  return {
    future: settlementFuture,
    reject(reason: Error): void {
      executor.settle(settlementResolverKey, left(toFailure(reason)));
    },
    resolve(value: Return): void {
      executor.settle(settlementResolverKey, right(value));
    },
  };
}

export interface Action<Return> {
  readonly future: RiteFuture<Return>;
  resolve(value: Return): void;
  reject(reason: Error): void;
}
