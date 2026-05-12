import type { ChannelHandle, OverloadRewrite } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { channelFailure } from "#/failures";
import { channel as channelSigil } from "#/sigils/index";
import { halt } from "./halt";
import { wisp } from "#/internal/fp";

/**
 * Opens a current-scope channel.
 *
 * @param capacity - Buffer capacity.
 * @param overloadRewrite - Overload policy for finite buffers.
 * @returns Receiver and sender endpoints.
 */
export function channel<Value, Outcome>(
  capacity: number,
  overloadRewrite?: OverloadRewrite<Value>,
): Wisp<ChannelHandle<Value, Outcome>> {
  if (capacity < MINIMUM_CAPACITY || Number.isNaN(capacity)) {
    return halt(
      channelFailure(
        { capacity, kind: "invalid-capacity" },
        `Channel capacity must be a non-negative number: ${capacity}`,
      ),
    );
  }

  return wisp.liftF(channelSigil<Value, Outcome>(capacity, overloadRewrite));
}

export type {
  ChannelHandle,
  ChannelEndpoint,
  ChannelReceiver,
  ChannelSender,
  OverloadRewrite,
} from "#/sigils/index";

const MINIMUM_CAPACITY = 0;
