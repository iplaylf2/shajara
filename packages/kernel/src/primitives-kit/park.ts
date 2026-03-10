import type { Wisp } from "#src/contracts";
import { messageKey } from "#src/contracts/message-key";
import { pipe } from "fp-ts/function";
import { receive } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function park(): Wisp<never> {
  return pipe(receive(parkMessageKey), wisp.liftF);
}

const parkMessageKey = messageKey<never>();
