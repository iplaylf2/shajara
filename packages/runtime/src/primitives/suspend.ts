import type { RiteCoroutine } from "#src/contracts";
import { suspend as kernelSuspend } from "@shajara/kernel";
import { liftBlueprint } from "#src/boundary";

export function suspend(): RiteCoroutine<never> {
  return liftBlueprint(() => kernelSuspend())();
}
