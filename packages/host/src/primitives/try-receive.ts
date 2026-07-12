import type { Presence, RiteCoroutine } from "#/contracts/index.js";
import type { ChannelReceiver } from "@shajara/kernel";
import { channelErrorOf } from "#/primitives-kit/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { isNone } from "@shajara/kernel/utils";
import { tryReceive as kernelTryReceive } from "@shajara/kernel";

/**
 * Attempts one receive from a channel without waiting.
 *
 * @returns `[true, value]` when a value is ready, or `[false]` when no value is ready.
 * @throws `ChannelError` when the receiver is closed or revoked.
 */
export function* tryReceive<Value, Outcome>(
  receiver: ChannelReceiver<Value, Outcome>,
): RiteCoroutine<Presence<Value>> {
  const result = yield* encodeRitual(() => kernelTryReceive(receiver))();

  if (isNone(result)) {
    return [false];
  }

  switch (result.value.kind) {
    case "value": {
      return [true, result.value.value];
    }
    case "closed":
    case "revoked": {
      throw channelErrorOf(result.value);
    }
  }
}
