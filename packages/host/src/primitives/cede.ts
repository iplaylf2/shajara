import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { cede as kernelCede } from "@shajara/kernel";

/**
 * Yields executor progression from the current coroutine.
 *
 * @returns Completion after the executor resumes the coroutine.
 */
export function cede(): RiteCoroutine<void> {
  return encodeRitual(kernelCede)();
}
