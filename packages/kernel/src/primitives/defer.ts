import type { Ritual, Wisp } from "#/contracts";
import { defer as deferSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Registers process cleanup.
 *
 * @param cleanup - Cleanup ritual.
 * @returns Completion after registration.
 */
export function defer(cleanup: Ritual<void>): Wisp<void> {
  return wisp.liftF(deferSigil(cleanup));
}
