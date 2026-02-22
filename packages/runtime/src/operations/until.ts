import type { RuntimePlan } from "#src/contracts";
import type { Settlement } from "#src/operations-kit/settlement";
import { ensureExecutor } from "@khora/kernel";
import { receive as kernelReceive } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { scoped } from "#src/primitives/scoped";
import { self } from "#src/primitives/self";

export type RuntimeUntilThunk<ReturnValue> = () => PromiseLike<ReturnValue>;

export function* until<ReturnValue>(
  thunk: RuntimeUntilThunk<ReturnValue>,
): RuntimePlan<ReturnValue> {
  const executor = ensureExecutor();
  return yield* scoped(function* untilBlueprint(): RuntimePlan<ReturnValue> {
    const { scopeId } = yield* self();

    thunk().then(
      (value: ReturnValue) => executor.post(scopeId, { status: "resolved", value }),
      (reason: unknown) => executor.post(scopeId, { reason, status: "rejected" }),
    );

    const settlement = yield* liftPlan(kernelReceive<Settlement<ReturnValue>>());
    switch (settlement.status) {
      case "resolved":
        return settlement.value;
      case "rejected":
        throw settlement.reason;
    }
  });
}
