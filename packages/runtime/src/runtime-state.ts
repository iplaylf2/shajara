interface ScopeHandle {
  readonly id: number;
}

interface RuntimeState {
  nextScopeId: number;
  readonly queuedInputsByScope: Map<number, unknown[]>;
}

const createRuntimeState = (): RuntimeState => ({
  nextScopeId: 1,
  queuedInputsByScope: new Map<number, unknown[]>(),
});

const allocateScope = (runtimeState: RuntimeState): ScopeHandle => {
  const scopeHandle: ScopeHandle = { id: runtimeState.nextScopeId };
  runtimeState.nextScopeId += 1;
  runtimeState.queuedInputsByScope.set(scopeHandle.id, []);
  return scopeHandle;
};

const enqueueScopeInput = (
  runtimeState: RuntimeState,
  scopeHandle: ScopeHandle,
  inputValue: unknown,
): void => {
  const queue = runtimeState.queuedInputsByScope.get(scopeHandle.id);
  if (!queue) {
    runtimeState.queuedInputsByScope.set(scopeHandle.id, [inputValue]);
    return;
  }

  queue.push(inputValue);
};

const drainScopeInputs = (runtimeState: RuntimeState, scopeHandle: ScopeHandle): void => {
  const queue = runtimeState.queuedInputsByScope.get(scopeHandle.id);
  if (!queue) {
    return;
  }

  queue.length = 0;
};

export type { RuntimeState, ScopeHandle };
export { allocateScope, createRuntimeState, drainScopeInputs, enqueueScopeInput };
