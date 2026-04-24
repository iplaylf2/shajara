import type { ChannelEndpoint } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { close as closeSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function close<Outcome>(
  endpoint: ChannelEndpoint<unknown, Outcome>,
  outcome: Outcome,
): Wisp<void> {
  return wisp.liftF(closeSigil(endpoint, outcome));
}
