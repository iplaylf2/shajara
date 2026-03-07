import { notImplemented } from "#src/internal/not-implemented";

declare const VALUE_TOKEN: unique symbol;

// oxlint-disable-next-line id-length
export type ContextKeyValue<K extends ContextKey<unknown>> =
  K extends ContextKey<infer Value> ? Value : never;

export function contextKey<Value>(): ContextKey<Value> {
  return notImplemented("context key token creation");
}

export interface ContextKey<Value> {
  readonly [VALUE_TOKEN]?: readonly [Value];
}
