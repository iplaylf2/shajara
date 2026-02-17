import type { Syscall } from "@khora/kernel";

const RUNTIME_STEP_TOKEN: unique symbol = Symbol("runtime-step");

export interface RuntimeStep<ReturnValue> {
  readonly kind: "syscall";
  readonly syscall: Syscall<ReturnValue>;
  readonly [RUNTIME_STEP_TOKEN]: "runtime-step";
}

export function createRuntimeStep<ReturnValue>(
  syscall: Syscall<ReturnValue>,
): RuntimeStep<ReturnValue> {
  return {
    kind: "syscall",
    [RUNTIME_STEP_TOKEN]: "runtime-step",
    syscall,
  };
}
