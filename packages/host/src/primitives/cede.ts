import type { RiteCoroutine } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { cede as kernelCede } from "@shajara/kernel";

export function cede(): RiteCoroutine<void> {
  return encodeRitual(kernelCede)();
}
