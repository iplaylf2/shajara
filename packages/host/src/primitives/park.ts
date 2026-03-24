import type { RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { park as kernelPark } from "@shajara/kernel";

export function park(): RiteCoroutine<never> {
  return encodeRitual(kernelPark)();
}
