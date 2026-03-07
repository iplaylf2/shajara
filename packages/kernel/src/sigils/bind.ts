import type { ContextKey, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

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
