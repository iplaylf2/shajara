import type { ContextKey, RETURN_TOKEN, Sigil } from "#src/contracts";

export function unbind(key: ContextKey<unknown>): UnbindSigil {
  return {
    key,
    kind: "unbind",
  };
}

export interface UnbindSigil extends Sigil {
  readonly kind: "unbind";
  readonly key: ContextKey<unknown>;
  readonly [RETURN_TOKEN]?: readonly [void];
}
