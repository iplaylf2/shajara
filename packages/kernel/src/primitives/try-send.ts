import type { ChannelSender } from "./channel";
import type { Option } from "#/utils/index";
import type { SendResult } from "./send";
import type { Wisp } from "#/contracts";
import { trySend as trySendSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Attempts one channel send without blocking.
 *
 * @returns Immediate send result, or `none` when the send would block.
 */
export function trySend<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): Wisp<Option<SendResult<Outcome>>> {
  return wisp.liftF(trySendSigil(sender, value));
}
