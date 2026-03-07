import type { ContextKey, Wisp } from "#src/contracts";
import { wisp } from "#src/internal/fp";
import { unbind as unbindSigil } from "#src/sigils";

export function unbind(key: ContextKey<unknown>): Wisp<void> {
  return wisp.liftF(unbindSigil(key));
}
