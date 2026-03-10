import type { MessageKey, Wisp } from "#src/contracts";
import { receive as receiveSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function receive<Value>(messageKey: MessageKey<Value>): Wisp<Value> {
  return wisp.liftF(receiveSigil(messageKey));
}
