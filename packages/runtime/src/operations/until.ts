import { scoped, self } from "#src/primitives";
import type { IngressScopeRef } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";
import type { Settlement } from "#src/operations-kit/settlement";
import { ensureExecutor } from "@khora/kernel";
import { ingressScopeSpec } from "@khora/kernel/scopes";
import { receive as kernelReceive } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export type RuntimeUntilThunk<ReturnValue> = () => PromiseLike<ReturnValue>;

export function* until<ReturnValue>(
  thunk: RuntimeUntilThunk<ReturnValue>,
): RuntimePlan<ReturnValue> {
  const executor = ensureExecutor();
  return yield* scoped(
    function* untilBlueprint(): RuntimePlan<ReturnValue> {
      const { scopeRef } = yield* self();

      thunk().then(
        (value: ReturnValue) =>
          executor.post(scopeRef as IngressScopeRef, { status: "resolved", value }),
        (reason: unknown) =>
          executor.post(scopeRef as IngressScopeRef, { reason, status: "rejected" }),
      );

      const settlement = yield* liftPlan(kernelReceive<Settlement<ReturnValue>>());
      switch (settlement.status) {
        case "resolved":
          return settlement.value;
        case "rejected":
          throw settlement.reason;
      }
    },
    { spec: ingressScopeSpec() },
  );
}
