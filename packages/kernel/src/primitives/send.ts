import type { Channel, ScopeRef, Wisp } from "#src/contracts";
import { send as sendSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function send<Value>(
  scope: ScopeRef<unknown>,
  channel: Channel<Value>,
  value: Value,
): Wisp<void> {
  return wisp.liftF(sendSigil(scope, channel, value));
}
