import type { Wisp } from "#src/contracts";
import { cede as cedeSyscall } from "#src/syscalls";
import { wisp } from "#src/internal/fp";

export function cede(): Wisp<void> {
  return wisp.liftF(cedeSyscall());
}
