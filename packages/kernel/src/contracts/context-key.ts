import type { KEY_TOKEN } from "./token";

declare const VALUE_TOKEN: unique symbol;

// oxlint-disable-next-line id-length
export type ContextKeyValue<K extends ContextKey<unknown>> =
  K extends ContextKey<infer Value> ? Value : never;

export function contextKey<Value>(): ContextKey<Value> {
  return {} as ContextKey<Value>;
}

export interface ContextKey<Value> {
  readonly [KEY_TOKEN]: "context";
  readonly [VALUE_TOKEN]?: readonly [Value];
}
