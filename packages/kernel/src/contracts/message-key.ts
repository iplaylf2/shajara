import type { KEY_TOKEN } from "./token";

declare const VALUE_TOKEN: unique symbol;

// oxlint-disable-next-line id-length
export type MessageKeyValue<K extends MessageKey<unknown>> =
  K extends MessageKey<infer Value> ? Value : never;

export function messageKey<Value>(): MessageKey<Value> {
  return {} as MessageKey<Value>;
}

export interface MessageKey<Value> {
  readonly [KEY_TOKEN]: "message";
  readonly [VALUE_TOKEN]?: readonly [Value];
}
