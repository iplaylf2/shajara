import type { RejectedSettlement, ResolvedSettlement, Settlement } from "#src/operations-kit";
import { ensureExecutor, liftSyscall, receive as receiveSyscall, signal } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";
import type { ScopeRef } from "@khora/kernel";
import { liftPlan } from "#src/adapter/plan-lift";
import { spawn } from "#src/primitives";

export interface RuntimeAction<Return> {
  readonly scope: ScopeRef<Return>;
  resolve(value: Return): void;
  reject(reason: Error): void;
}

const settlementSignal = signal<Settlement<unknown>>();

export function* action<Return>(): RuntimePlan<RuntimeAction<Return>> {
  const scope = yield* spawn(function* actionBlueprint(): RuntimePlan<Return> {
    const { value: settlement } = yield* liftPlan(liftSyscall(receiveSyscall(settlementSignal)));
    switch (settlement.status) {
      case "resolved":
        return settlement.value as Return;
      case "rejected":
        throw settlement.reason;
    }
  });
  const executor = ensureExecutor();

  return {
    reject(reason: Error): void {
      executor.post(scope, settlementSignal, {
        reason,
        status: "rejected",
      } satisfies RejectedSettlement);
    },
    resolve(value: Return): void {
      executor.post(scope, settlementSignal, {
        status: "resolved",
        value,
      } satisfies ResolvedSettlement<Return>);
    },
    scope,
  };
}
