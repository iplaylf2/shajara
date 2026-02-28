import type { RETURN_TOKEN } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export interface Signal<Value> {
  readonly [RETURN_TOKEN]?: readonly [Value];
}

// oxlint-disable-next-line id-length
export type SignalValue<S extends Signal<unknown>> = S extends Signal<infer Value> ? Value : never;

export function signal<Value>(): Signal<Value> {
  return notImplemented("signal token creation");
}
