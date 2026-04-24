import type { ChannelSender, SendResult } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { send as sendSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function send<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): Wisp<SendResult<Outcome>> {
  return wisp.liftF(sendSigil(sender, value));
}

export type { SendResult } from "#/sigils/index";
