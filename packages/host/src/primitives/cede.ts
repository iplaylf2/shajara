import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { cede as kernelCede } from "@shajara/kernel";

export function cede(): RiteCoroutine<void> {
  return encodeRitual(kernelCede)();
}
