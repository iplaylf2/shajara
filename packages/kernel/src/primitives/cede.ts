import type { Wisp } from "#src/contracts";
import { cede as cedeSyscall } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function cede(): Wisp<void> {
  return wisp.liftF(cedeSyscall());
}
