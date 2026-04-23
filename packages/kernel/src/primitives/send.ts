import type { ChannelSender, SendResult } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { send as sendSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function send<Value>(sender: ChannelSender<Value>, value: Value): Wisp<SendResult> {
  return wisp.liftF(sendSigil(sender, value));
}

export type { SendResult } from "#/sigils/index";
