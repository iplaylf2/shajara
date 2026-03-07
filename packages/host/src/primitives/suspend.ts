import type { RiteCoroutine } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { suspend as kernelSuspend } from "@shajara/kernel";

export function suspend(): RiteCoroutine<never> {
  return encodeRitual(() => kernelSuspend())();
}
