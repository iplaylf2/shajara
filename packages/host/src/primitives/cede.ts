import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { cede as kernelCede } from "@shajara/kernel";

/** Cedes the current turn before the routine continues. */
export function cede(): RiteCoroutine<void> {
  return encodeRitual(kernelCede)();
}
