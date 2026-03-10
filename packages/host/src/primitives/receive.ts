import type { MessageKey, RiteCoroutine } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { receive as kernelReceive } from "@shajara/kernel";

export function receive<Value>(messageKey: MessageKey<Value>): RiteCoroutine<Value> {
  return encodeRitual(() => kernelReceive(messageKey))();
}
