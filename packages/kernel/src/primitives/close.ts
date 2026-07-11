import type { ChannelEndpoint } from "./channel.js";
import type { Wisp } from "#/contracts/index.js";
import { close as closeSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/** Closes a channel explicitly and resumes blocked operations with the close outcome. */
export function close<Outcome>(
  endpoint: ChannelEndpoint<unknown, Outcome>,
  outcome: Outcome,
): Wisp<void> {
  return wisp.liftF(closeSigil(endpoint, outcome));
}
