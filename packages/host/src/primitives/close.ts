import type { ChannelEndpoint } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { close as kernelClose } from "@shajara/kernel";

/** Closes a channel endpoint and resumes blocked operations with the close outcome. */
export function close<Outcome>(
  endpoint: ChannelEndpoint<unknown, Outcome>,
  outcome: Outcome,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelClose(endpoint, outcome))();
}
