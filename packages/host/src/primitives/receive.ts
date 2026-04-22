import type { ChannelReceiver, ReceiveResult } from "@shajara/kernel";
import { ChannelError } from "#/errors";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { receive as kernelReceive } from "@shajara/kernel";

export function* receive<Value>(receiver: ChannelReceiver<Value>): RiteCoroutine<Value> {
  const result = yield* encodeRitual(() => kernelReceive(receiver))();

  switch (result.kind) {
    case "value":
      return result.value;
    case "closed":
    case "revoked":
      throw new ChannelError(result, messageOf(result));
  }
}

function messageOf(result: Exclude<ReceiveResult<unknown>, { kind: "value" }>): string {
  switch (result.kind) {
    case "closed":
      return "Channel is closed";
    case "revoked":
      return "Channel is revoked";
  }
}
