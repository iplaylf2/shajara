import type { RiteCoroutine, ScopeRef } from "#src/contracts";
import { awaitFuture, future, spawn } from "#src/primitives";
import { left, right } from "@shajara/kernel/utils";
import { ensureExecutor } from "@shajara/kernel";
import { toFailure } from "#src/boundary";

export function* action<Return>(): RiteCoroutine<HostAction<Return>> {
  const [settlementFuture, settlementResolverKey] = yield* future<Return>();
  const scope = yield* spawn(function* actionRitual(): RiteCoroutine<Return> {
    return yield* awaitFuture(settlementFuture);
  });
  const executor = ensureExecutor();

  return {
    reject(reason: Error): void {
      executor.settle(settlementResolverKey, left(toFailure(reason)));
    },
    resolve(value: Return): void {
      executor.settle(settlementResolverKey, right(value));
    },
    scope,
  };
}

export interface HostAction<Return> {
  readonly scope: ScopeRef<Return>;
  resolve(value: Return): void;
  reject(reason: Error): void;
}
