import type { SelfHandle } from "#/sigils/index";
import type { Wisp } from "#/contracts";
import { self as selfSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Reads the current scope and process identity.
 *
 * @returns Current scope and process references.
 */
export function self(): Wisp<SelfHandle> {
  return wisp.liftF(selfSigil());
}

export type { SelfHandle } from "#/sigils/index";
