import type { ChannelReceiver } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts/index.js";
import { channelErrorOf } from "#/primitives-kit/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { receive as kernelReceive } from "@shajara/kernel";

/**
 * Waits until a channel receiver yields its next value.
 *
 * @returns Delivered channel value.
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
