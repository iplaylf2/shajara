import type { RuntimePlan, RuntimeSpawnRef } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export interface RuntimeAction<ReturnValue> {
  readonly scope: RuntimeSpawnRef<ReturnValue>;
  resolve(value: ReturnValue): void;
  reject(reason: unknown): void;
}

export function action<ReturnValue>(): RuntimePlan<RuntimeAction<ReturnValue>> {
  return notImplemented("runtime operation 'action'");
}
