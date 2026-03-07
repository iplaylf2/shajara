import type { Channel, ReceiveResult, RiteCoroutine } from "#src/contracts";
import { receive as kernelReceive } from "@shajara/kernel";
import { encodeRitual } from "#src/boundary";

export function receive<ReceiveValue>(
  channel: Channel<ReceiveValue>,
): RiteCoroutine<ReceiveResult<ReceiveValue>> {
  return encodeRitual(() => kernelReceive(channel))();
}
