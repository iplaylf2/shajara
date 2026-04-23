import type { ChannelHandle, OverloadRewrite } from "@shajara/kernel";
import { ChannelError } from "#/errors";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { channel as kernelChannel } from "@shajara/kernel";

export function channel<Value>(
  capacity: number,
  overloadRewrite?: OverloadRewrite<Value>,
): RiteCoroutine<ChannelHandle<Value>> {
  if (capacity < MINIMUM_CAPACITY || Number.isNaN(capacity)) {
    throw new ChannelError(
      { capacity, kind: "invalid-capacity" },
      `Channel capacity must be a non-negative number: ${capacity}`,
    );
  }

  return encodeRitual(() => kernelChannel<Value>(capacity, overloadRewrite))();
}

export type {
  ChannelHandle,
  ChannelReceiver,
  ChannelSender,
  OverloadRewrite,
} from "@shajara/kernel";

const MINIMUM_CAPACITY = 0;
