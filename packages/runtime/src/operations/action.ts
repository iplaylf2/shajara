import type { RuntimePlan } from "#src/contracts";
import type { SpawnRef } from "@khora/kernel";
import { ensureExecutor } from "@khora/kernel";
import { receive as kernelReceive } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { spawn } from "#src/primitives/spawn";

export interface RuntimeAction<ReturnValue> {
  readonly scope: SpawnRef<ReturnValue>;
  resolve(value: ReturnValue): void;
  reject(reason: unknown): void;
}

interface ActionResolve<ReturnValue> {
  readonly status: "resolved";
  readonly value: ReturnValue;
}

interface ActionReject {
  readonly status: "rejected";
  readonly reason: unknown;
}

type ActionSettlement<ReturnValue> = ActionResolve<ReturnValue> | ActionReject;

export function* action<ReturnValue>(): RuntimePlan<RuntimeAction<ReturnValue>> {
  const scope = yield* spawn(function* actionBlueprint(): RuntimePlan<ReturnValue> {
    const settlement = yield* liftPlan(kernelReceive<ActionSettlement<ReturnValue>>());
    switch (settlement.status) {
      case "resolved":
        return settlement.value;
      case "rejected":
        throw settlement.reason;
    }
  });
  const executor = ensureExecutor();

  return {
    reject(reason: unknown): void {
      executor.post(scope, { reason, status: "rejected" } satisfies ActionReject);
    },
    resolve(value: ReturnValue): void {
      executor.post(scope, { status: "resolved", value } satisfies ActionResolve<ReturnValue>);
    },
    scope,
  };
}
