import type { ChannelSender } from "./channel";
import type { Option } from "#/utils/index";
import type { SendResult } from "./send";
import type { Wisp } from "#/contracts";
import { trySend as trySendSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Sends without blocking.
 *
 * @param sender - Channel sender endpoint.
 * @param value - Payload.
 * @returns Immediate send result, or none.
 */
export function trySend<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): Wisp<Option<SendResult<Outcome>>> {
  return wisp.liftF(trySendSigil(sender, value));
}
