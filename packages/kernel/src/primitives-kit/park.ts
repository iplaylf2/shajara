import type { Wisp } from "#src/contracts";
import { messageKey } from "#src/contracts/message-key";
import { receive } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function park(): Wisp<never> {
  return wisp.liftF(receive(parkMessageKey));
}

const parkMessageKey = messageKey<never>();
