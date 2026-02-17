import type { RuntimePlan } from "#src/contracts";
import type { Syscall } from "@khora/kernel";
import { createRuntimeStep } from "#src/runtime-step";

export function* liftSyscall<ReturnValue>(syscall: Syscall<ReturnValue>): RuntimePlan<ReturnValue> {
  const result = yield createRuntimeStep(syscall);
  if (result.kind === "err") {
    throw new Error(
      "Not implemented: mapping syscall error result into runtime-side control flow.",
    );
  }

  return result.value as ReturnValue;
}
