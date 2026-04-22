import type { ChannelReceiver, ReceiveResult } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { receive as receiveSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function receive<Value>(receiver: ChannelReceiver<Value>): Wisp<ReceiveResult<Value>> {
  return wisp.liftF(receiveSigil(receiver));
}

export type { ReceiveResult } from "#/sigils/index";
