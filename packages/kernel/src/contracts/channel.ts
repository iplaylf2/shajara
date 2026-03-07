import { notImplemented } from "#src/internal/not-implemented";

declare const VALUE_TOKEN: unique symbol;

// oxlint-disable-next-line id-length
export type ChannelValue<C extends Channel<unknown>> =
  C extends Channel<infer Value> ? Value : never;

export function channel<Value>(): Channel<Value> {
  return notImplemented("channel token creation");
}

export interface Channel<Value> {
  readonly [VALUE_TOKEN]?: readonly [Value];
}
