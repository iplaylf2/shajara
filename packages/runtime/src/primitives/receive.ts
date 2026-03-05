import type { Channel, ReceiveResult, RuntimePlan } from "#src/contracts";
import { receive as kernelReceive } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";

export function receive<ReceiveValue>(
  channel: Channel<ReceiveValue>,
): RuntimePlan<ReceiveResult<ReceiveValue>> {
  return liftBlueprint(() => kernelReceive(channel));
}
