import type { ECHO_TOKEN, KEY_TOKEN, SigilShape } from "#/contracts";
import type { ArrayValues } from "type-fest";

export function channel<Value, Outcome>(
  capacity: number,
  overloadRewrite: OverloadRewrite<Value> = defaultOverloadRewrite,
): ChannelSigil<Value, Outcome> {
  return {
    capacity,
    kind: "channel",
    overloadRewrite,
  };
}

export function defaultOverloadRewrite<Value>(
  buffer: readonly Value[],
  _incoming: Value,
): readonly Value[] {
  return buffer;
}

export type OverloadRewrite<Value> = (
  buffer: readonly Value[],
  incoming: Value,
) => readonly Value[];

export interface ChannelSigil<Value, Outcome> extends SigilShape {
  readonly kind: "channel";
  readonly capacity: number;
  readonly overloadRewrite: OverloadRewrite<Value>;
  readonly [ECHO_TOKEN]?: readonly [ChannelHandle<Value, Outcome>];
}

export type ChannelHandle<Value, Outcome> = readonly [
  receiver: ChannelReceiver<Value, Outcome>,
  sender: ChannelSender<Value, Outcome>,
];

export type ChannelEndpoint<Value, Outcome> = ArrayValues<ChannelHandle<Value, Outcome>>;

export interface ChannelReceiver<Value, Outcome> {
  readonly [KEY_TOKEN]: "channel-receiver";
  readonly [TYPE_TOKEN]?: readonly [Value, Outcome];
}

export interface ChannelSender<Value, Outcome> {
  readonly [KEY_TOKEN]: "channel-sender";
  readonly [TYPE_TOKEN]?: readonly [Value, Outcome];
}

declare const TYPE_TOKEN: unique symbol;
