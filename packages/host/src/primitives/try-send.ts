import type { ChannelSender } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { channelErrorOf } from "#/primitives-kit";
import { encodeRitual } from "#/boundary/index";
import { isNone } from "@shajara/kernel/utils";
import { trySend as kernelTrySend } from "@shajara/kernel";

/**
 * Attempts one send through a channel without waiting.
 *
 * @returns `true` when sent, or `false` when the send would block.
 * @throws `ChannelError` when the sender is closed or revoked.
 */
export function* trySend<Value, Outcome>(
  sender: ChannelSender<Value, Outcome>,
  value: Value,
): RiteCoroutine<boolean> {
  const result = yield* encodeRitual(() => kernelTrySend(sender, value))();

  if (isNone(result)) {
    return false;
  }

  switch (result.value.kind) {
    case "sent": {
      return true;
    }
    case "closed":
    case "revoked": {
      throw channelErrorOf(result.value);
    }
  }
}
