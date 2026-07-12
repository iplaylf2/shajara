import type { ContextKey, Wisp } from "#/contracts/index.js";
import { unbind as unbindSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/** Removes the current scope's binding for a context key. */
export function unbind(key: ContextKey<unknown>): Wisp<void> {
  return wisp.liftF(unbindSigil(key));
}
