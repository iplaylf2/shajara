import type { FutureKey, FutureResult, FutureSettleKey, ProcessRef } from "#src/contracts";
import type { Option } from "#src/utils";

export interface FutureRecord {
  readonly key: FutureKey<unknown>;
  readonly listeners: Set<(result: FutureResult<unknown>) => void>;
  result: Option<FutureResult<unknown>>;
  readonly settleKey: FutureSettleKey<unknown>;
  readonly waitingProcesses: Set<ProcessRef<unknown>>;
}
