import type { RiteCoroutine, SelfHandle } from "#/contracts/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { self as kernelSelf } from "@shajara/kernel";

/**
 * Reads the current scope and process identity.
 *
 * @returns Current scope and process references.
 */
export function self(): RiteCoroutine<SelfHandle> {
  return encodeRitual(() => kernelSelf())();
}
