import type { RETURN_TOKEN } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export interface Channel<Value> {
  readonly [RETURN_TOKEN]?: readonly [Value];
}

// oxlint-disable-next-line id-length
export type ChannelValue<C extends Channel<unknown>> =
  C extends Channel<infer Value> ? Value : never;

export function channel<Value>(): Channel<Value> {
  return notImplemented("channel token creation");
}
