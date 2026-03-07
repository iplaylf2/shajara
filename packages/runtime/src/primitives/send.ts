import type { Channel, RiteCoroutine, ScopeRef } from "#src/contracts";
import { send as kernelSend } from "@shajara/kernel";
import { liftBlueprint } from "#src/boundary";

export function send<Value>(
  scope: ScopeRef<unknown>,
  channel: Channel<Value>,
  value: Value,
): RiteCoroutine<void> {
  return liftBlueprint(() => kernelSend(scope, channel, value))();
}
