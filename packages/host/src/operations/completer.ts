import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { left, right } from "@shajara/kernel/utils";
import { ensureExecutor } from "#/executor";
import { future } from "#/primitives/index";
import { toFailure } from "#/boundary/index";

export function* completer<Return>(): RiteCoroutine<Completer<Return>> {
  const executor = ensureExecutor();
  const [result, settleResult] = yield* future<Return>();

  return {
    future: result,
    reject(reason) {
      executor.settle(settleResult, left(toFailure(reason)));
    },
    resolve(value) {
      executor.settle(settleResult, right(value));
    },
  };
}

export interface Completer<Return> {
  readonly future: RiteFuture<Return>;
  resolve(value: Return): void;
  reject(reason: Error): void;
}
