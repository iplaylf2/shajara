import type { ContextKey, Wisp } from "#src/contracts";
import { unbind as unbindSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function unbind(key: ContextKey<unknown>): Wisp<void> {
  return wisp.liftF(unbindSigil(key));
}
