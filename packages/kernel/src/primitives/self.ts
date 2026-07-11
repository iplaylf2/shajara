import type { SelfHandle } from "#/sigils/index.js";
import type { Wisp } from "#/contracts/index.js";
import { self as selfSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Reads the current scope and process identity.
 *
 * @returns Current scope and process references.
 */
export function self(): Wisp<SelfHandle> {
  return wisp.liftF(selfSigil());
}

export type { SelfHandle } from "#/sigils/index.js";
