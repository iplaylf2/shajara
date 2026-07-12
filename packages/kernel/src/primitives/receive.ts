import type { ChannelReceiver } from "./channel.js";
import type { ReceiveResult } from "#/sigils/index.js";
import type { Wisp } from "#/contracts/index.js";
import { receive as receiveSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Waits until a channel receiver has a value or reaches a terminal state.
 *
 * @returns Delivered value, explicit close, or revoked terminal state.
 */
export function receive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): Wisp<ReceiveResult<Value, Outcome>> {
  return wisp.liftF(receiveSigil(receiver));
}

export type { ReceiveResult } from "#/sigils/index.js";
