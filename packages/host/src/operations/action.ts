import type { RejectedSettlement, ResolvedSettlement, Settlement } from "#src/operations-kit";
import type { RiteCoroutine, ScopeRef } from "#src/contracts";
import { channel } from "#src/contracts";
import { ensureExecutor } from "@shajara/kernel";
import { receive } from "#src/primitives/receive";
import { spawn } from "#src/primitives/spawn";

export function* action<Return>(): RiteCoroutine<HostAction<Return>> {
  const scope = yield* spawn(function* actionRitual(): RiteCoroutine<Return> {
    const { value: settlement } = yield* receive(settlementChannel);
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

export interface HostAction<Return> {
  readonly scope: ScopeRef<Return>;
  resolve(value: Return): void;
  reject(reason: Error): void;
}

const settlementChannel = channel<Settlement<unknown>>();
