import type { ChannelReceiver, ChannelSender } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { close as closeSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function close(endpoint: ChannelReceiver<unknown> | ChannelSender<unknown>): Wisp<void> {
  return wisp.liftF(closeSigil(endpoint));
}
