import type { ChannelReceiver } from "./channel";
import type { ReceiveResult } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { receive as receiveSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

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

export type { ReceiveResult } from "#/sigils/index";
