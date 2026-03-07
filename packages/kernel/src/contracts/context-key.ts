import type { RELIC_TOKEN } from "./token";
import { notImplemented } from "#src/internal/not-implemented";

// oxlint-disable-next-line id-length
export type ContextKeyValue<K extends ContextKey<unknown>> =
  K extends ContextKey<infer Value> ? Value : never;

export function contextKey<Value>(): ContextKey<Value> {
  return notImplemented("context key token creation");
}

export interface ContextKey<Value> {
  readonly [RELIC_TOKEN]?: readonly [Value];
}
