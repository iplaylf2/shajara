import { ensureExecutor, liftSyscall, receive as receiveSyscall } from "@khora/kernel";
import { scoped, self } from "#src/primitives";
import type { IngressScopeRef } from "@khora/kernel/scopes";
import type { RuntimePlan } from "#src/contracts";
import type { Settlement } from "#src/operations-kit";
import { ingressScopeSpec } from "@khora/kernel/scopes";
import { liftPlan } from "#src/adapter/plan-lift";

export type RuntimeUntilThunk<Return> = () => PromiseLike<Return>;

export function* until<Return>(thunk: RuntimeUntilThunk<Return>): RuntimePlan<Return> {
  const executor = ensureExecutor();
  return yield* scoped(
    function* untilBlueprint(): RuntimePlan<Return> {
      const { scopeRef } = yield* self<IngressScopeRef<Return>>();

      thunk().then(
        (value: Return) => executor.post(scopeRef, { status: "resolved", value }),
        (reason: unknown) => executor.post(scopeRef, { reason, status: "rejected" }),
      );

      const { value: settlement } = yield* liftPlan(
        liftSyscall(receiveSyscall<Settlement<Return>>()),
      );
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
