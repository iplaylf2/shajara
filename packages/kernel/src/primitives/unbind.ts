import type { ContextKey, Wisp } from "#/contracts";
import { unbind as unbindSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/** Removes the current scope's binding for a context key. */
export function unbind(key: ContextKey<unknown>): Wisp<void> {
  return wisp.liftF(unbindSigil(key));
}
