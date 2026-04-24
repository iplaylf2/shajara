import type { ChannelSender } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { channelErrorOf } from "#/primitives-kit";
import { encodeRitual } from "#/boundary";
import { send as kernelSend } from "@shajara/kernel";

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
