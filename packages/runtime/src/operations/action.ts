import type { RejectedSettlement, ResolvedSettlement, Settlement } from "#src/operations-kit";
import { ensureExecutor, liftSyscall, receive as receiveSyscall } from "@khora/kernel";
import type { IngressScopeRef } from "@khora/kernel/scopes";
import type { RuntimePlan } from "#src/contracts";
import { ingressScopeSpec } from "@khora/kernel/scopes";
import { liftPlan } from "#src/adapter/plan-lift";
import { spawn } from "#src/primitives";

export interface RuntimeAction<Return> {
  readonly scope: IngressScopeRef<Return>;
  resolve(value: Return): void;
  reject(reason: unknown): void;
}

export function* action<Return>(): RuntimePlan<RuntimeAction<Return>> {
  const scope = yield* spawn(function* actionBlueprint(): RuntimePlan<Return> {
    const { value: settlement } = yield* liftPlan(
      liftSyscall(receiveSyscall<Settlement<Return>>()),
    );
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
      executor.post(scope, {
        reason,
        status: "rejected",
      } satisfies RejectedSettlement);
    },
    resolve(value: Return): void {
      executor.post(scope, {
        status: "resolved",
        value,
      } satisfies ResolvedSettlement<Return>);
    },
    scope,
  };
}
