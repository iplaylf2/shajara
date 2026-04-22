import type { ChannelSender, SendResult } from "@shajara/kernel";
import { ChannelError } from "#/errors";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { send as kernelSend } from "@shajara/kernel";

export function* send<Value>(sender: ChannelSender<Value>, value: Value): RiteCoroutine<void> {
  const result = yield* encodeRitual(() => kernelSend(sender, value))();

  switch (result.kind) {
    case "sent":
      return;
    case "closed":
    case "revoked":
      throw new ChannelError(result, messageOf(result));
  }
}

function messageOf(result: Exclude<SendResult, { kind: "sent" }>): string {
  switch (result.kind) {
    case "closed":
      return "Channel is closed";
    case "revoked":
      return "Channel is revoked";
  }
}
