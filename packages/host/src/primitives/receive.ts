import type { MessageKey, ReceiveResult, RiteCoroutine } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { receive as kernelReceive } from "@shajara/kernel";

export function receive<ReceiveValue>(
  messageKey: MessageKey<ReceiveValue>,
): RiteCoroutine<ReceiveResult<ReceiveValue>> {
  return encodeRitual(() => kernelReceive(messageKey))();
}
