import type { Wisp } from "#/contracts";
import { cede as cedeSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export function cede(): Wisp<void> {
  return wisp.liftF(cedeSigil());
}
