import type { ChannelReceiver } from "./channel";
import type { Option } from "#/utils/index";
import type { ReceiveResult } from "./receive";
import type { Wisp } from "#/contracts";
import { tryReceive as tryReceiveSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Attempts one channel receive without blocking.
 *
 * @returns Immediate receive result, or `none` when no state is ready.
 */
export function tryReceive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): Wisp<Option<ReceiveResult<Value, Outcome>>> {
  return wisp.liftF(tryReceiveSigil(receiver));
}
