import type { ChannelReceiver, ReceiveResult } from "#/sigils/index";
import type { Option } from "#/utils/index";
import type { Wisp } from "#/contracts";
import { tryReceive as tryReceiveSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function tryReceive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): Wisp<Option<ReceiveResult<Value, Outcome>>> {
  return wisp.liftF(tryReceiveSigil(receiver));
}
