import { future, wait } from "#src/primitives";
import { left, right } from "@shajara/kernel/utils";
import type { RiteCoroutine } from "#src/contracts";
import { ensureExecutor } from "@shajara/kernel";
import { toFailureUnknown } from "#src/boundary";

export function* until<Return>(thunk: PromiseThunk<Return>): RiteCoroutine<Return> {
  const executor = ensureExecutor();
  const [settlementFuture, settlementSettleKey] = yield* future<Return>();

  thunk().then(
    (value: Return) => executor.settle(settlementSettleKey, right(value)),
    (reason: unknown) => executor.settle(settlementSettleKey, left(toFailureUnknown(reason))),
  );

  return yield* wait(settlementFuture);
}

export type PromiseThunk<Return> = () => PromiseLike<Return>;
