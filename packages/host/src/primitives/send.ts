import type { ChannelSender } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { channelErrorOf } from "#/primitives-kit";
import { encodeRitual } from "#/boundary/index";
import { send as kernelSend } from "@shajara/kernel";

/**
 * Sends a value through a channel sender, blocking until accepted.
 *
 * @param sender - Sender endpoint.
 * @param value - Value to send.
 * @returns Completion after the value is accepted.
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
