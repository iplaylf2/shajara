import type { ECHO_TOKEN, KEY_TOKEN, SigilShape } from "#/contracts";

export function channel<Value>(
  capacity: number,
  overloadRewrite: OverloadRewrite<Value> = defaultOverloadRewrite,
): ChannelSigil<Value> {
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

export interface ChannelSigil<Value> extends SigilShape {
  readonly kind: "channel";
  readonly capacity: number;
  readonly overloadRewrite: OverloadRewrite<Value>;
  readonly [ECHO_TOKEN]?: readonly [ChannelHandle<Value>];
}

export type ChannelHandle<Value> = readonly [
  receiver: ChannelReceiver<Value>,
  sender: ChannelSender<Value>,
];

export interface ChannelReceiver<Value> {
  readonly [KEY_TOKEN]: "channel-receiver";
  readonly [VALUE_TOKEN]?: readonly [Value];
}

export interface ChannelSender<Value> {
  readonly [KEY_TOKEN]: "channel-sender";
  readonly [VALUE_TOKEN]?: readonly [Value];
}

declare const VALUE_TOKEN: unique symbol;
