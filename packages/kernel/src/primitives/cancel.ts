import type { Wisp } from "#src/contracts";
import { cancel as cancelSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function cancel(): Wisp<never> {
  return wisp.liftF(cancelSigil());
}
