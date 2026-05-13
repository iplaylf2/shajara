import type { RiteCoroutine, SelfHandle } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { self as kernelSelf } from "@shajara/kernel";

/**
 * Reads the current scope and process references.
 *
 * @returns Current self handle.
 */
export function self(): RiteCoroutine<SelfHandle> {
  return encodeRitual(() => kernelSelf())();
}
