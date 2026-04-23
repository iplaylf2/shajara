import { ChannelError } from "#/errors";
import type { ChannelReceiver } from "@shajara/kernel";
import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { receive as kernelReceive } from "@shajara/kernel";
import { messageOf } from "#/primitives-kit";

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
