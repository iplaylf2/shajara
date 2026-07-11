import type { ChannelHandle, OverloadRewrite } from "#/sigils/index.js";
import type { Wisp } from "#/contracts/index.js";
import { channelFailure } from "#/failures/index.js";
import { channel as channelSigil } from "#/sigils/index.js";
import { halt } from "./halt.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Opens a channel owned by the current scope.
 * Negative or `NaN` capacity converges the current process with a channel failure.
 *
 * @param capacity - `0` creates rendezvous delivery, finite positives create bounded
 * buffering, and `Infinity` creates unbounded buffering.
 * @param overloadRewrite - Finite-buffer policy applied before an overloaded send is accepted.
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
} from "#/sigils/index.js";

const MINIMUM_CAPACITY = 0;
