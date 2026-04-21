import type { ChannelReceiver, ReceiveResult } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { narrowAs } from "#/utils";
import { pipe } from "fp-ts/lib/function";
import { receive } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function receiveInBand<Value>(channel: ChannelReceiver<Value>): Wisp<Value> {
  return pipe(
    receive(channel),
    wisp.liftF,
    wisp.map(narrowAs<Extract<ReceiveResult<Value>, { kind: "value" }>>()),
    wisp.map(({ value }) => value),
  );
}
