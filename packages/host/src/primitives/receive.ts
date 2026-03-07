import type { Channel, ReceiveResult, RiteCoroutine } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { receive as kernelReceive } from "@shajara/kernel";

export function receive<ReceiveValue>(
  channel: Channel<ReceiveValue>,
): RiteCoroutine<ReceiveResult<ReceiveValue>> {
  return encodeRitual(() => kernelReceive(channel))();
}
