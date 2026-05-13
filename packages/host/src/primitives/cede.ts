import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { cede as kernelCede } from "@shajara/kernel";

/** Cedes the current turn before the coroutine continues. */
export function cede(): RiteCoroutine<void> {
  return encodeRitual(kernelCede)();
}
