import { liftBlueprint, toFailure } from "#src/boundary";
import type { RiteCoroutine } from "#src/contracts";
import { ScopeHaltedError } from "#src/errors";
import { halt as kernelHalt } from "@shajara/kernel";

export function halt(error: Error = new ScopeHaltedError()): RiteCoroutine<never> {
  return liftBlueprint(() => kernelHalt(toFailure(error)))();
}
