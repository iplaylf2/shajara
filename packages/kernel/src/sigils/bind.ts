import type { ContextKey, ECHO_TOKEN, Sigil } from "#src/contracts";

export function bind<Value>(key: ContextKey<Value>, value: Value): BindSigil<Value> {
  return {
    key,
    kind: "bind",
    value,
  };
}

export interface BindSigil<Value> extends Sigil {
  readonly kind: "bind";
  readonly key: ContextKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [void];
  readonly value: Value;
}
