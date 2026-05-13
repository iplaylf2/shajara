import type { ChannelEndpoint } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { close as kernelClose } from "@shajara/kernel";

/** Closes a channel endpoint, resuming opposite-end operations with the close outcome. */
export function close<Outcome>(
  endpoint: ChannelEndpoint<unknown, Outcome>,
  outcome: Outcome,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelClose(endpoint, outcome))();
}
