import { receive, scoped, self } from "#src/primitives";
import type { RuntimePlan } from "#src/contracts";
import type { Settlement } from "#src/operations-kit";
import { channel } from "#src/contracts";
import { ensureExecutor } from "@shajara/kernel";

export function* until<Return>(thunk: RuntimeUntilThunk<Return>): RuntimePlan<Return> {
  const executor = ensureExecutor();
  return yield* scoped(function* untilBlueprint(): RuntimePlan<Return> {
    const { scopeRef } = yield* self();

    thunk().then(
      (value: Return) => executor.send(scopeRef, settlementChannel, { status: "resolved", value }),
      (reason: unknown) =>
        executor.send(scopeRef, settlementChannel, { reason, status: "rejected" }),
    );

    const { value: settlement } = yield* receive(settlementChannel);
    switch (settlement.status) {
      case "resolved":
        return settlement.value as Return;
      case "rejected":
        throw settlement.reason;
    }
  });
}

export type RuntimeUntilThunk<Return> = () => PromiseLike<Return>;

const settlementChannel = channel<Settlement<unknown>>();
