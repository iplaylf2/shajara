import type { ChannelSender } from "./channel.js";
import type { SendResult } from "#/sigils/index.js";
import type { Wisp } from "#/contracts/index.js";
import { send as sendSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Waits until a channel sender accepts the value or reaches a terminal state.
 *
 * @returns Accepted send, explicit close, or revoked terminal state.
 */
export function send<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): Wisp<SendResult<Outcome>> {
  return wisp.liftF(sendSigil(sender, value));
}

export type { SendResult } from "#/sigils/index.js";
