import type { ContextKey, Wisp } from "#/contracts";
import { unbind as unbindSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/** Removes a context binding from the current scope. */
export function unbind(key: ContextKey<unknown>): Wisp<void> {
  return wisp.liftF(unbindSigil(key));
}
