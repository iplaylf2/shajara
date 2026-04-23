import type { ChannelSender, SendResult } from "#/sigils/index";
import type { Option } from "#/utils/index";
import type { Wisp } from "#/contracts";
import { trySend as trySendSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function trySend<Value>(
  sender: ChannelSender<Value>,
  value: Value,
): Wisp<Option<SendResult>> {
  return wisp.liftF(trySendSigil(sender, value));
}
