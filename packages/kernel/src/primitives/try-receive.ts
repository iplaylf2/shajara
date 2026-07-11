import type { ChannelReceiver } from "./channel.js";
import type { Option } from "#/utils/index.js";
import type { ReceiveResult } from "./receive.js";
import type { Wisp } from "#/contracts/index.js";
import { tryReceive as tryReceiveSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Attempts one channel receive without blocking the current process.
 *
 * @returns Immediate receive result, or `none` when no state is ready.
 */
export function tryReceive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): Wisp<Option<ReceiveResult<Value, Outcome>>> {
  return wisp.liftF(tryReceiveSigil(receiver));
}
