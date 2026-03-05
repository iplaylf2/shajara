import type { Channel, RuntimePlan, ScopeRef } from "#src/contracts";
import { send as kernelSend } from "@khora/kernel";
import { liftBlueprint } from "#src/boundary";

export function send<Value>(
  scope: ScopeRef<unknown>,
  channel: Channel<Value>,
  value: Value,
): RuntimePlan<void> {
  return liftBlueprint(() => kernelSend(scope, channel, value));
}
