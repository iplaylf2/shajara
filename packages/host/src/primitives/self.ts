import type { RiteCoroutine, SelfHandle } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { self as kernelSelf } from "@shajara/kernel";

export function self(): RiteCoroutine<SelfHandle> {
  return encodeRitual(() => kernelSelf())();
}
