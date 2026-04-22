import type { ChannelReceiver, ChannelSender } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { close as kernelClose } from "@shajara/kernel";

export function close(
  endpoint: ChannelReceiver<unknown> | ChannelSender<unknown>,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelClose(endpoint))();
}
