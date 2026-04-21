import type { ECHO_TOKEN, KEY_TOKEN, SigilShape } from "#/contracts";

export function channel<Value>(capacity: number): ChannelSigil<Value> {
  return {
    capacity,
    kind: "channel",
  };
}

export interface ChannelSigil<Value> extends SigilShape {
  readonly kind: "channel";
  readonly capacity: number;
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
