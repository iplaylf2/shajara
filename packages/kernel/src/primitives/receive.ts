import type { MessageKey, Wisp } from "#src/contracts";
import type { ReceiveResult } from "#src/sigils";
import { receive as receiveSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export type { ReceiveResult } from "#src/sigils";

export function receive<ReceiveValue>(
  messageKey: MessageKey<ReceiveValue>,
): Wisp<ReceiveResult<ReceiveValue>> {
  return wisp.liftF(receiveSigil(messageKey));
}
