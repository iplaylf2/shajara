import type { ChannelHandle, OverloadRewrite } from "@shajara/kernel";
import { ChannelError } from "#/errors";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { channel as kernelChannel } from "@shajara/kernel";

/**
 * Opens a channel in the current scope.
 *
 * @param capacity - Channel buffer capacity.
 * @param overloadRewrite - Overload policy for finite buffers.
 * @returns Receiver and sender endpoints.
 * @throws `ChannelError` when `capacity` is negative or `NaN`.
 */
export function channel<Value, Outcome>(
  capacity: number,
  overloadRewrite?: OverloadRewrite<Value>,
): RiteCoroutine<ChannelHandle<Value, Outcome>> {
  if (capacity < MINIMUM_CAPACITY || Number.isNaN(capacity)) {
    throw new ChannelError(
      { cause: { capacity, kind: "invalid-capacity" }, kind: "cause" },
      `Channel capacity must be a non-negative number: ${capacity}`,
    );
  }

  return encodeRitual(() => kernelChannel<Value, Outcome>(capacity, overloadRewrite))();
}

export type {
  ChannelEndpoint,
  ChannelHandle,
  ChannelReceiver,
  ChannelSender,
  OverloadRewrite,
} from "@shajara/kernel";

const MINIMUM_CAPACITY = 0;
