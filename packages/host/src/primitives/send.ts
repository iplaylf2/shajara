import type { ChannelSender } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts/index.js";
import { channelErrorOf } from "#/primitives-kit/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { send as kernelSend } from "@shajara/kernel";

/**
 * Sends a value through a channel sender and waits until it is accepted.
 *
 * @throws `ChannelError` when the sender is closed or revoked.
 */
export function* send<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): RiteCoroutine<void> {
  const result = yield* encodeRitual(() => kernelSend(sender, value))();

  switch (result.kind) {
    case "sent": {
      return;
    }
    case "closed":
    case "revoked": {
      throw channelErrorOf(result);
    }
  }
}
