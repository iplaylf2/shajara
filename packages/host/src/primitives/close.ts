import type { ChannelEndpoint } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { close as kernelClose } from "@shajara/kernel";

/**
 * Closes a channel endpoint with an explicit outcome.
 *
 * @param endpoint - Receiver or sender endpoint to close.
 * @param outcome - Close outcome observed by the opposite endpoint.
 * @returns Completion after close is requested.
 */
export function close<Outcome>(
  endpoint: ChannelEndpoint<unknown, Outcome>,
  outcome: Outcome,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelClose(endpoint, outcome))();
}
