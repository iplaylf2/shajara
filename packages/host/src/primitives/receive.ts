import type { ChannelReceiver } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { channelErrorOf } from "#/primitives-kit";
import { encodeRitual } from "#/boundary/index";
import { receive as kernelReceive } from "@shajara/kernel";

/**
 * Waits for the next value from a channel receiver.
 *
 * @param receiver - Receiver endpoint to observe.
 * @returns Received value.
 * @throws `ChannelError` when the receiver is closed or revoked.
 */
export function* receive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): RiteCoroutine<Value> {
  const result = yield* encodeRitual(() => kernelReceive(receiver))();

  switch (result.kind) {
    case "value": {
      return result.value;
    }
    case "closed":
    case "revoked": {
      throw channelErrorOf(result);
    }
  }
}
