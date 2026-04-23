import type { Presence, RiteCoroutine } from "#/contracts";
import { ChannelError } from "#/errors";
import type { ChannelReceiver } from "@shajara/kernel";
import { encodeRitual } from "#/boundary";
import { isNone } from "@shajara/kernel/utils";
import { tryReceive as kernelTryReceive } from "@shajara/kernel";
import { messageOf } from "#/primitives-kit";

export function* tryReceive<Value>(
  receiver: ChannelReceiver<Value>,
): RiteCoroutine<Presence<Value>> {
  const result = yield* encodeRitual(() => kernelTryReceive(receiver))();

  if (isNone(result)) {
    return [false];
  }

  switch (result.value.kind) {
    case "value":
      return [true, result.value.value];
    case "closed":
    case "revoked":
      throw new ChannelError(result.value, messageOf(result.value));
  }
}
