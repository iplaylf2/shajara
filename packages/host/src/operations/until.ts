import { join, receive, self, spawn } from "#src/primitives";
import type { RiteCoroutine } from "#src/contracts";
import type { Settlement } from "#src/operations-kit";
import { ensureExecutor } from "@shajara/kernel";
import { messageKey } from "#src/contracts";

export function* until<Return>(thunk: HostUntilThunk<Return>): RiteCoroutine<Return> {
  const executor = ensureExecutor();
  const scope = yield* spawn(
    function* untilRitual(): RiteCoroutine<Return> {
      const { scopeRef } = yield* self();

      thunk().then(
        (value: Return) =>
          executor.send(scopeRef, settlementMessageKey, { status: "resolved", value }),
        (reason: unknown) =>
          executor.send(scopeRef, settlementMessageKey, { reason, status: "rejected" }),
      );

      const settlement = yield* receive(settlementMessageKey);
      switch (settlement.status) {
        case "resolved":
          return settlement.value as Return;
        case "rejected":
          throw settlement.reason;
      }
    },
    { mode: "supervisor" },
  );

  return yield* join(scope);
}

export type HostUntilThunk<Return> = () => PromiseLike<Return>;

const settlementMessageKey = messageKey<Settlement<unknown>>();
