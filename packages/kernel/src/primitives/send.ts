import type { ChannelSender } from "./channel";
import type { SendResult } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { send as sendSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Sends a channel value or observes terminal state.
 *
 * @param sender - Channel sender endpoint.
 * @param value - Payload.
 * @returns Sent, closed, or revoked state.
 */
export function send<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): Wisp<SendResult<Outcome>> {
  return wisp.liftF(sendSigil(sender, value));
}

export type { SendResult } from "#/sigils/index";
