import type { ContextKey, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

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
