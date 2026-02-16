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
  readonly call:
    | { readonly method: string; readonly args: readonly unknown[] }
    | undefined;
}

export type {
  RuntimeScopeHandle,
  RuntimeSelfDescriptor,
  RuntimeSpawnRef,
};
