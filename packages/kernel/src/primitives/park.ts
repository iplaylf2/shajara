import type { Wisp } from "#/contracts";
import { messageKey } from "#/contracts";
import { receive } from "#/sigils";
import { wisp } from "#/internal/fp";

export function park(): Wisp<never> {
  return wisp.liftF(receive(parkMessageKey));
}

const parkMessageKey = messageKey<never>();
