import type { ContextKey, ECHO_TOKEN, SigilShape } from "#/contracts";

export function bind<Value>(key: ContextKey<Value>, value: Value): BindSigil<Value> {
  return {
    key,
    kind: "bind",
    value,
  };
}

export interface BindSigil<Value> extends SigilShape {
  readonly kind: "bind";
  readonly key: ContextKey<Value>;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
  readonly value: Value;
}
