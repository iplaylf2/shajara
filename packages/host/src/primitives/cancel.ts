import type { RiteCoroutine } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { cancel as kernelCancel } from "@shajara/kernel";

export function cancel(): RiteCoroutine<never> {
  return encodeRitual(kernelCancel)();
}
