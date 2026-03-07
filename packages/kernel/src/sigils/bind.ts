import type { ContextKey, RETURN_TOKEN, Sigil } from "#src/contracts";

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
  readonly [RETURN_TOKEN]?: readonly [void];
  readonly value: Value;
}
