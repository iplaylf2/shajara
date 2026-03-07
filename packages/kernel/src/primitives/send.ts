import type { Channel, Wisp, ScopeRef } from "#src/contracts";
import { wisp } from "#src/internal/fp";
import { send as sendSyscall } from "#src/syscalls";

export function send<Value>(
  scope: ScopeRef<unknown>,
  channel: Channel<Value>,
  value: Value,
): Wisp<void> {
  return wisp.liftF(sendSyscall(scope, channel, value));
}
