import type { KEY_TOKEN } from "./token";

/** Value type encoded by a context key. */
// oxlint-disable-next-line id-length
export type ContextKeyValue<K extends ContextKey<unknown>> =
  K extends ContextKey<infer Value> ? Value : never;

/**
 * Allocates an opaque context identity.
 *
 * @returns Fresh opaque key scoped by its value type.
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
