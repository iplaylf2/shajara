import type { IngressScopeRef, SpawnRef } from "@khora/kernel";
import type {
  RejectedSettlement,
  ResolvedSettlement,
  Settlement,
} from "#src/operations-kit/settlement";
import type { RuntimePlan } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { ingressScopeSpec } from "@khora/kernel/primitives-kit";
import { receive as kernelReceive } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { spawn } from "#src/primitives/spawn";

export interface RuntimeAction<ReturnValue> {
  readonly scope: SpawnRef<ReturnValue>;
  resolve(value: ReturnValue): void;
  reject(reason: unknown): void;
}

export function* action<ReturnValue>(): RuntimePlan<RuntimeAction<ReturnValue>> {
  const scope = yield* spawn(function* actionBlueprint(): RuntimePlan<ReturnValue> {
    const settlement = yield* liftPlan(kernelReceive<Settlement<ReturnValue>>());
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
    resolve(value: ReturnValue): void {
      executor.post(scope as IngressScopeRef, {
        status: "resolved",
        value,
      } satisfies ResolvedSettlement<ReturnValue>);
    },
    scope,
  };
}
