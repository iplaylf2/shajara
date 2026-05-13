import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { cede as kernelCede } from "@shajara/kernel";

/** Yields cooperatively before the current coroutine continues. */
export function cede(): RiteCoroutine<void> {
  return encodeRitual(kernelCede)();
}
