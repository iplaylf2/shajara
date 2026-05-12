import type { ChannelReceiver } from "./channel";
import type { ReceiveResult } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { receive as receiveSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Receives a channel value or terminal state.
 *
 * @param receiver - Channel receiver endpoint.
 * @returns Value, close, or revocation state.
 */
export function receive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): Wisp<ReceiveResult<Value, Outcome>> {
  return wisp.liftF(receiveSigil(receiver));
}

export type { ReceiveResult } from "#/sigils/index";
