import { ChannelError } from "#/errors";
import type { ChannelSender } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { send as kernelSend } from "@shajara/kernel";
import { messageOf } from "#/primitives-kit";

export function* send<Value>(sender: ChannelSender<Value>, value: Value): RiteCoroutine<void> {
  const result = yield* encodeRitual(() => kernelSend(sender, value))();

  switch (result.kind) {
    case "sent": {
      return;
    }
    case "closed":
    case "revoked": {
      throw new ChannelError(result, messageOf(result));
    }
  }
}
