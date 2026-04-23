import { ChannelError } from "#/errors";
import type { ChannelSender } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { isNone } from "@shajara/kernel/utils";
import { trySend as kernelTrySend } from "@shajara/kernel";
import { messageOf } from "#/primitives-kit";

export function* trySend<Value>(
  sender: ChannelSender<Value>,
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
      throw new ChannelError(result.value, messageOf(result.value));
    }
  }
}
