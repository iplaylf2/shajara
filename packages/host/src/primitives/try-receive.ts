import type { Presence, RiteCoroutine } from "#/contracts";
import type { ChannelReceiver } from "@shajara/kernel";
import { channelErrorOf } from "#/primitives-kit";
import { encodeRitual } from "#/boundary/index";
import { isNone } from "@shajara/kernel/utils";
import { tryReceive as kernelTryReceive } from "@shajara/kernel";

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
