import type { Channel, ReceiveResult, RuntimePlan } from "#src/contracts";
import { receive as kernelReceive } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function receive<ReceiveValue>(
  channel: Channel<ReceiveValue>,
): RuntimePlan<ReceiveResult<ReceiveValue>> {
  return liftPlan(kernelReceive(channel));
}
