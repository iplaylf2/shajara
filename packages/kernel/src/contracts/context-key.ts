import type { KEY_TOKEN } from "./token";

/** Extracts the value type carried by a context key. */
// oxlint-disable-next-line id-length
export type ContextKeyValue<K extends ContextKey<unknown>> =
  K extends ContextKey<infer Value> ? Value : never;

/**
 * Defines context lookup identity.
 *
 * @returns Opaque key scoped by its value type.
 */
export function contextKey<Value>(): ContextKey<Value> {
  return {} as ContextKey<Value>;
}

/** Opaque identity for a value stored in scope context. */
export interface ContextKey<Value> {
  readonly [KEY_TOKEN]: "context";
  readonly [VALUE_TOKEN]?: readonly [Value];
}

declare const VALUE_TOKEN: unique symbol;
