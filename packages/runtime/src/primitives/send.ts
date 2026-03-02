import type { Channel, RuntimePlan, ScopeRef } from "#src/contracts";
import { send as kernelSend } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function send<Value>(
  scope: ScopeRef<unknown>,
  channel: Channel<Value>,
  value: Value,
): RuntimePlan<void> {
  return liftPlan(kernelSend(scope, channel, value));
}
