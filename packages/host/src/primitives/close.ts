import type { ChannelEndpoint } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { close as kernelClose } from "@shajara/kernel";

export function close<Outcome>(
  endpoint: ChannelEndpoint<unknown, Outcome>,
  outcome: Outcome,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelClose(endpoint, outcome))();
}
