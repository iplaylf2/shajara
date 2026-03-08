import type { MessageKey, ScopeRef, Wisp } from "#src/contracts";
import { send as sendSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function send<Value>(
  scope: ScopeRef<unknown>,
  messageKey: MessageKey<Value>,
  value: Value,
): Wisp<void> {
  return wisp.liftF(sendSigil(scope, messageKey, value));
}
