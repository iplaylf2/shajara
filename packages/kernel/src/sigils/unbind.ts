import type { ContextKey, ECHO_TOKEN, SigilShape } from "#/contracts";

export function unbind(key: ContextKey<unknown>): UnbindSigil {
  return {
    key,
    kind: "unbind",
  };
}

export interface UnbindSigil extends SigilShape {
  readonly kind: "unbind";
  readonly key: ContextKey<unknown>;
  readonly [ECHO_TOKEN]?: readonly [void];
}
