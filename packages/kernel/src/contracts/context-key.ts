import type { KEY_TOKEN } from "./token.js";

/** Extracts the value type associated with a context key. */
// oxlint-disable-next-line id-length
export type ContextKeyValue<K extends ContextKey<unknown>> =
  K extends ContextKey<infer Value> ? Value : never;

/**
 * Allocates a fresh context key for scope-chain binding and lookup.
 *
 * @returns Opaque key associated with its value type.
 */
export function contextKey<Value>(): ContextKey<Value> {
  return {} as ContextKey<Value>;
}

/** Opaque identity used to bind and resolve values along the scope chain. */
export interface ContextKey<Value> {
  readonly [KEY_TOKEN]: "context";
  readonly [VALUE_TOKEN]?: readonly [Value];
}

declare const VALUE_TOKEN: unique symbol;
