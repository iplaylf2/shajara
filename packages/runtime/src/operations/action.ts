import type { RejectedSettlement, ResolvedSettlement, Settlement } from "#src/operations-kit";
import { channel, ensureExecutor, liftSyscall, receive as receiveSyscall } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";
import type { ScopeRef } from "@khora/kernel";
import { liftPlan } from "#src/adapter/plan-lift";
import { spawn } from "#src/primitives";

export function* action<Return>(): RuntimePlan<RuntimeAction<Return>> {
  const scope = yield* spawn(function* actionBlueprint(): RuntimePlan<Return> {
    const { value: settlement } = yield* liftPlan(liftSyscall(receiveSyscall(settlementChannel)));
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
      executor.send(scope, settlementChannel, {
        reason,
        status: "rejected",
      } satisfies RejectedSettlement);
    },
    resolve(value: Return): void {
      executor.send(scope, settlementChannel, {
        status: "resolved",
        value,
      } satisfies ResolvedSettlement<Return>);
    },
    scope,
  };
}

export interface RuntimeAction<Return> {
  readonly scope: ScopeRef<Return>;
  resolve(value: Return): void;
  reject(reason: Error): void;
}

const settlementChannel = channel<Settlement<unknown>>();
