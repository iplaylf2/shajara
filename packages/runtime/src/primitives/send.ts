import type { Channel, RuntimePlan, ScopeRef } from "#src/contracts";
import { send as kernelSend } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";

export function send<Value>(
  scope: ScopeRef<unknown>,
  channel: Channel<Value>,
  value: Value,
): RuntimePlan<void> {
  return liftBlueprint(() => kernelSend(scope, channel, value));
}
