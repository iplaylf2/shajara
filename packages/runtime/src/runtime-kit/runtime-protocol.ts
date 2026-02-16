import type { Result, Syscall } from "@khora/kernel";

const RUNTIME_STEP_TOKEN: unique symbol = Symbol("runtime-step");

interface RuntimeStep<ReturnValue> {
  readonly kind: "syscall";
  readonly syscall: Syscall<ReturnValue>;
  readonly [RUNTIME_STEP_TOKEN]: "runtime-step";
}

type RuntimeResumeValue<ReturnValue> = Result<ReturnValue>;

type RuntimePlan<ReturnValue> = Generator<
  RuntimeStep<unknown>,
  ReturnValue,
  RuntimeResumeValue<unknown>
>;

type RuntimePrimitive<ReturnValue> = () => RuntimePlan<ReturnValue>;

function createRuntimeStep<ReturnValue>(
  syscall: Syscall<ReturnValue>,
): RuntimeStep<ReturnValue> {
  return {
    kind: "syscall",
    [RUNTIME_STEP_TOKEN]: "runtime-step",
    syscall,
  };
}

function* liftSyscall<ReturnValue>(
  syscall: Syscall<ReturnValue>,
): RuntimePlan<ReturnValue> {
  const result: RuntimeResumeValue<unknown> = yield createRuntimeStep(syscall);
  if (result.kind === "err") {
    throw new Error(
      "Not implemented: mapping syscall error result into runtime-side control flow.",
    );
  }

  return result.value as ReturnValue;
}

export { liftSyscall };
export type { RuntimePlan, RuntimePrimitive };
