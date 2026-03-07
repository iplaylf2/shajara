import type { RiteCoroutine } from "#src/contracts";
import { suspend as kernelSuspend } from "@shajara/kernel";
import { encodeRitual } from "#src/boundary";

export function suspend(): RiteCoroutine<never> {
  return encodeRitual(() => kernelSuspend())();
}
