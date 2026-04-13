import { encodeRitual, toFailure } from "#/boundary";
import type { RiteCoroutine } from "#/contracts";
import { halt as kernelHalt } from "@shajara/kernel";

export function halt(error: Error): RiteCoroutine<never> {
  return encodeRitual(() => kernelHalt(toFailure(error)))();
}
