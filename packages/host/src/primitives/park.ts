import type { RiteCoroutine } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { park as kernelPark } from "@shajara/kernel";

export function park(): RiteCoroutine<never> {
  return encodeRitual(kernelPark)();
}
