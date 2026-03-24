import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { cancel as kernelCancel } from "@shajara/kernel";

export function cancel(): RiteCoroutine<never> {
  return encodeRitual(kernelCancel)();
}
