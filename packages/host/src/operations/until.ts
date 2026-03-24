import { future, wait } from "#/primitives";
import { left, right } from "@shajara/kernel/utils";
import type { RiteCoroutine } from "#/contracts";
import { ensureExecutor } from "@shajara/kernel";
import { toFailureUnknown } from "#/boundary";

export function* until<Return>(thunk: PromiseThunk<Return>): RiteCoroutine<Return> {
  const executor = ensureExecutor();
  const [resultFuture, resultSettle] = yield* future<Return>();

  thunk().then(
    (value: Return) => executor.settle(resultSettle, right(value)),
    (reason: unknown) => executor.settle(resultSettle, left(toFailureUnknown(reason))),
  );

  return yield* wait(resultFuture);
}

export type PromiseThunk<Return> = () => PromiseLike<Return>;
