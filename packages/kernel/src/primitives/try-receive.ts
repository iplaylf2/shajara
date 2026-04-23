import type { ChannelReceiver, ReceiveResult } from "#/sigils/index";
import type { Option } from "#/utils/index";
import type { Wisp } from "#/contracts";
import { tryReceive as tryReceiveSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function tryReceive<Value>(
  receiver: ChannelReceiver<Value>,
): Wisp<Option<ReceiveResult<Value>>> {
  return wisp.liftF(tryReceiveSigil(receiver));
}
