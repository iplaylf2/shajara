import type { Result, Syscall } from "@khora/kernel";

const RUNTIME_SCOPE_HANDLE_TOKEN: unique symbol = Symbol("runtime-scope-handle");
const RUNTIME_SPAWN_REF_TOKEN: unique symbol = Symbol("runtime-spawn-ref");
interface RuntimeScopeHandle {
  readonly [RUNTIME_SCOPE_HANDLE_TOKEN]: "runtime-scope-handle";
}

interface RuntimeSpawnRef<ReturnValue = unknown> {
  readonly [RUNTIME_SPAWN_REF_TOKEN]: "runtime-spawn-ref";
  readonly _return?: ReturnValue;
}

interface RuntimeSelfDescriptor {
  readonly scope: RuntimeScopeHandle;
  readonly call: { readonly method: string; readonly args: readonly unknown[] } | undefined;
}

type RuntimeResumeValue<ReturnValue> = Result<ReturnValue>;

export type RuntimePlan<ReturnValue> = Generator<
  Syscall<unknown>,
  ReturnValue,
  RuntimeResumeValue<unknown>
>;

export type RuntimePrimitive<ReturnValue> = () => RuntimePlan<ReturnValue>;

export type RuntimePrimitiveTuple<ReturnValues extends readonly unknown[]> = {
  [Index in keyof ReturnValues]: RuntimePrimitive<ReturnValues[Index]>;
};

export type RuntimeBlueprint<ReturnValue> = () => RuntimePlan<ReturnValue>;

export type { RuntimeScopeHandle, RuntimeSelfDescriptor, RuntimeSpawnRef };
