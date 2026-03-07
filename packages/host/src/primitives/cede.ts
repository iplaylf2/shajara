import type { RiteCoroutine } from "#src/contracts";
import { cede as kernelCede } from "@shajara/kernel";
import { encodeRitual } from "#src/boundary";

export function cede(): RiteCoroutine<void> {
  return encodeRitual(() => kernelCede())();
}
