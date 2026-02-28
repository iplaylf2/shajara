import { channel, ensureExecutor, liftSyscall, receive as receiveSyscall } from "@khora/kernel";
import { scoped, self } from "#src/primitives";
import type { RuntimePlan } from "#src/contracts";
import type { Settlement } from "#src/operations-kit";
import { liftPlan } from "#src/adapter/plan-lift";

export function* until<Return>(thunk: RuntimeUntilThunk<Return>): RuntimePlan<Return> {
  const executor = ensureExecutor();
  return yield* scoped(function* untilBlueprint(): RuntimePlan<Return> {
    const { scopeRef } = yield* self();

    thunk().then(
      (value: Return) => executor.send(scopeRef, settlementChannel, { status: "resolved", value }),
      (reason: unknown) =>
        executor.send(scopeRef, settlementChannel, { reason, status: "rejected" }),
    );

    const { value: settlement } = yield* liftPlan(liftSyscall(receiveSyscall(settlementChannel)));
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
