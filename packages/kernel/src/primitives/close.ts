import type { ChannelEndpoint } from "./channel";
import type { Wisp } from "#/contracts";
import { close as closeSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Closes a channel with an explicit outcome.
 *
 * @param endpoint - Target endpoint.
 * @param outcome - Close outcome.
 * @returns Completion after the close request.
 */
export function close<Outcome>(
  endpoint: ChannelEndpoint<unknown, Outcome>,
  outcome: Outcome,
): Wisp<void> {
  return wisp.liftF(closeSigil(endpoint, outcome));
}
