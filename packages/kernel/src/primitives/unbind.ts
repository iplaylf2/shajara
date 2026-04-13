import type { ContextKey, Wisp } from "#/contracts";
import { unbind as unbindSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export function unbind(key: ContextKey<unknown>): Wisp<void> {
  return wisp.liftF(unbindSigil(key));
}
