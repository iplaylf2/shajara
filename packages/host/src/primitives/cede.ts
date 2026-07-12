import type { RiteCoroutine } from "#/contracts/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { cede as kernelCede } from "@shajara/kernel";

/** Cedes the current turn before the routine continues. */
export function cede(): RiteCoroutine<void> {
  return encodeRitual(kernelCede)();
}
