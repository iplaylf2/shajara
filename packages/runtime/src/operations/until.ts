import { ensureExecutor, liftSyscall, receive as receiveSyscall, signal } from "@khora/kernel";
import { scoped, self } from "#src/primitives";
import type { RuntimePlan } from "#src/contracts";
import type { Settlement } from "#src/operations-kit";
import { liftPlan } from "#src/adapter/plan-lift";

export type RuntimeUntilThunk<Return> = () => PromiseLike<Return>;

const settlementSignal = signal<Settlement<unknown>>();

export function* until<Return>(thunk: RuntimeUntilThunk<Return>): RuntimePlan<Return> {
  const executor = ensureExecutor();
  return yield* scoped(function* untilBlueprint(): RuntimePlan<Return> {
    const { scopeRef } = yield* self();

    thunk().then(
      (value: Return) => executor.post(scopeRef, settlementSignal, { status: "resolved", value }),
      (reason: unknown) =>
        executor.post(scopeRef, settlementSignal, { reason, status: "rejected" }),
    );

    const { value: settlement } = yield* liftPlan(liftSyscall(receiveSyscall(settlementSignal)));
    switch (settlement.status) {
      case "resolved":
        return settlement.value as Return;
      case "rejected":
        throw settlement.reason;
    }
  });
}
