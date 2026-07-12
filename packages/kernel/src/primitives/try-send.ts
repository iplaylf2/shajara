import type { ChannelSender } from "./channel.js";
import type { Option } from "#/utils/index.js";
import type { SendResult } from "./send.js";
import type { Wisp } from "#/contracts/index.js";
import { trySend as trySendSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Attempts one channel send without blocking the current process.
 *
 * @returns Immediate send result, or `none` when the send would block.
 */
export function trySend<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): Wisp<Option<SendResult<Outcome>>> {
  return wisp.liftF(trySendSigil(sender, value));
}
