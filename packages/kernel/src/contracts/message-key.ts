import { notImplemented } from "#src/internal/not-implemented";

declare const VALUE_TOKEN: unique symbol;

// oxlint-disable-next-line id-length
export type MessageKeyValue<K extends MessageKey<unknown>> =
  K extends MessageKey<infer Value> ? Value : never;

export function messageKey<Value>(): MessageKey<Value> {
  return notImplemented("message key token creation");
}

export interface MessageKey<Value> {
  readonly [VALUE_TOKEN]?: readonly [Value];
}
