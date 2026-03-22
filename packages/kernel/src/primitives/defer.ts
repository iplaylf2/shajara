import type { Ritual, Wisp } from "#src/contracts";
import { defer as deferSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function defer(cleanup: Ritual<void>): Wisp<void> {
  return wisp.liftF(deferSigil(cleanup));
}
