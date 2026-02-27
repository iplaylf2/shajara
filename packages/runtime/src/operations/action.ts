import type { IngressScopeRef, ScopeRef } from "@khora/kernel";
import type { RejectedSettlement, ResolvedSettlement, Settlement } from "#src/operations-kit";
import type { RuntimePlan } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { ingressScopeSpec } from "@khora/kernel/scopes";
import { receive as kernelReceive } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { spawn } from "#src/primitives";

export interface RuntimeAction<Return> {
  readonly scope: ScopeRef<Return>;
  resolve(value: Return): void;
  reject(reason: unknown): void;
}

export function* action<Return>(): RuntimePlan<RuntimeAction<Return>> {
  const scope = yield* spawn(function* actionBlueprint(): RuntimePlan<Return> {
    const settlement = yield* liftPlan(kernelReceive<Settlement<Return>>());
    switch (settlement.status) {
      case "resolved":
        return settlement.value;
      case "rejected":
        throw settlement.reason;
    }
  }, ingressScopeSpec());
  const executor = ensureExecutor();

  return {
    reject(reason: unknown): void {
      executor.post(scope as IngressScopeRef, {
        reason,
        status: "rejected",
      } satisfies RejectedSettlement);
    },
    resolve(value: Return): void {
      executor.post(scope as IngressScopeRef, {
        status: "resolved",
        value,
      } satisfies ResolvedSettlement<Return>);
    },
    scope,
  };
}
