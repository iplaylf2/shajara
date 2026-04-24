import type { ChannelReceiver, ReceiveResult } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { narrowAs } from "#/utils/index";
import { pipe } from "fp-ts/lib/function";
import { receive } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function receiveInBand<Value, Outcome>(
  channel: ChannelReceiver<Value, Outcome>,
): Wisp<Value> {
  return pipe(
    receive(channel),
    wisp.liftF,
    wisp.map(narrowAs<Extract<ReceiveResult<Value, Outcome>, { kind: "value" }>>()),
    wisp.map(({ value }) => value),
  );
}
