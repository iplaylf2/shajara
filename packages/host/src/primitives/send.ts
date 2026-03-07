import type { Channel, RiteCoroutine, ScopeRef } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { send as kernelSend } from "@shajara/kernel";

export function send<Value>(
  scope: ScopeRef<unknown>,
  channel: Channel<Value>,
  value: Value,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelSend(scope, channel, value))();
}
