import type { Wisp } from "#/contracts";
import { cede as cedeSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Yields cooperatively.
 *
 * @returns Completion after yielding.
 */
export function cede(): Wisp<void> {
  return wisp.liftF(cedeSigil());
}
