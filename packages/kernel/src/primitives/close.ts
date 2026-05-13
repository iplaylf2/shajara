import type { ChannelEndpoint } from "./channel";
import type { Wisp } from "#/contracts";
import { close as closeSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/** Closes a channel explicitly, resuming blocked operations with the close outcome. */
export function close<Outcome>(
  endpoint: ChannelEndpoint<unknown, Outcome>,
  outcome: Outcome,
): Wisp<void> {
  return wisp.liftF(closeSigil(endpoint, outcome));
}
