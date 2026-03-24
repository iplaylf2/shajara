import type { Ritual, Wisp } from "#/contracts";
import { defer as deferSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export function defer(cleanup: Ritual<void>): Wisp<void> {
  return wisp.liftF(deferSigil(cleanup));
}
