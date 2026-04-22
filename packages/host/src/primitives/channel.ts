import { ChannelError } from "#/errors";
import type { ChannelHandle } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { channel as kernelChannel } from "@shajara/kernel";

export function channel<Value>(capacity: number): RiteCoroutine<ChannelHandle<Value>> {
  if (capacity < MINIMUM_CAPACITY || Number.isNaN(capacity)) {
    throw new ChannelError(
      { capacity, kind: "invalid-capacity" },
      `Channel capacity must be a non-negative number: ${capacity}`,
    );
  }

  return encodeRitual(() => kernelChannel<Value>(capacity))();
}

export type { ChannelHandle, ChannelReceiver, ChannelSender } from "@shajara/kernel";

const MINIMUM_CAPACITY = 0;
