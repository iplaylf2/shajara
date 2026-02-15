interface ScopeHandle {
  readonly id: number;
}

interface RuntimeState {
  readonly rootScopeHandle: ScopeHandle;
  readonly queuedInputsByScope: Map<number, unknown[]>;
}

const ROOT_SCOPE_HANDLE: ScopeHandle = { id: 1 };

const RUNTIME_STATE: RuntimeState = {
  queuedInputsByScope: new Map<number, unknown[]>([[ROOT_SCOPE_HANDLE.id, []]]),
  rootScopeHandle: ROOT_SCOPE_HANDLE,
};

function postScopeInput(scopeHandle: ScopeHandle, inputValue: unknown): void {
  const queue = RUNTIME_STATE.queuedInputsByScope.get(scopeHandle.id);
  if (!queue) {
    RUNTIME_STATE.queuedInputsByScope.set(scopeHandle.id, [inputValue]);
    return;
  }

  queue.push(inputValue);
}

function clearScopeInputs(scopeHandle: ScopeHandle): void {
  const queue = RUNTIME_STATE.queuedInputsByScope.get(scopeHandle.id);
  if (!queue) {
    return;
  }

  queue.length = 0;
}

export type { RuntimeState, ScopeHandle };
export { clearScopeInputs, ROOT_SCOPE_HANDLE, postScopeInput };
