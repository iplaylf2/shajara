import type { RuntimePlan } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { receive as kernelReceive } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { scoped } from "#src/primitives/scoped";
import { self } from "#src/primitives/self";

export type RuntimeUntilThunk<ReturnValue> = () => PromiseLike<ReturnValue>;

interface UntilResolve<ReturnValue> {
  readonly status: "resolved";
  readonly value: ReturnValue;
}

interface UntilReject {
  readonly status: "rejected";
  readonly reason: unknown;
}

type UntilSettlement<ReturnValue> = UntilResolve<ReturnValue> | UntilReject;

export function* until<ReturnValue>(
  thunk: RuntimeUntilThunk<ReturnValue>,
): RuntimePlan<ReturnValue> {
  const executor = ensureExecutor();
  return yield* scoped(function* untilBlueprint(): RuntimePlan<ReturnValue> {
    const { scope } = yield* self();

    thunk().then(
      (value: ReturnValue) => executor.post(scope, { status: "resolved", value }),
      (reason: unknown) => executor.post(scope, { reason, status: "rejected" }),
    );

    const settlement = yield* liftPlan(kernelReceive<UntilSettlement<ReturnValue>>());
    switch (settlement.status) {
      case "resolved":
        return settlement.value;
      case "rejected":
        throw settlement.reason;
    }
  });
}
