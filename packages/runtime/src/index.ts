import { createKernelBoundary } from "@khora/kernel";

type RuntimeInstruction = {
  readonly kind: "yield-now";
};

type Flow<ReturnValue> = Generator<RuntimeInstruction, ReturnValue, unknown | null>;

type FlowFactory<ReturnValue> = () => Flow<ReturnValue>;

interface ScopeHandle {
  readonly id: number;
}

interface Runtime {
  post(scopeHandle: ScopeHandle, inputValue: unknown): void;
  run<ReturnValue>(flowFactory: FlowFactory<ReturnValue>): Promise<ReturnValue>;
}

interface RuntimeState {
  nextScopeId: number;
  readonly queuedInputsByScope: Map<number, unknown[]>;
}

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

const runFlow = <ReturnValue>(
  runtimeState: RuntimeState,
  flowFactory: FlowFactory<ReturnValue>,
): Promise<ReturnValue> => {
  const rootScopeHandle = allocateScope(runtimeState);
  const flowIterator = flowFactory();
  let resumeValue: null | unknown = null;

  const stepRuntime = async (): Promise<ReturnValue> => {
    const stepResult = flowIterator.next(resumeValue);
    if (stepResult.done) {
      return stepResult.value;
    }

    if (stepResult.value.kind !== "yield-now") {
      throw new Error("Unsupported runtime instruction");
    }

    await Promise.resolve();
    drainScopeInputs(runtimeState, rootScopeHandle);
    resumeValue = null;
    return stepRuntime();
  };

  return stepRuntime();
};

const createRuntime = (): Runtime => {
  const runtimeState: RuntimeState = {
    nextScopeId: 1,
    queuedInputsByScope: new Map<number, unknown[]>(),
  };

  createKernelBoundary();

  const runtime: Runtime = {
    post: (scopeHandle: ScopeHandle, inputValue: unknown): void => {
      enqueueScopeInput(runtimeState, scopeHandle, inputValue);
    },
    run: <ReturnValue>(flowFactory: FlowFactory<ReturnValue>): Promise<ReturnValue> =>
      runFlow(runtimeState, flowFactory),
  };

  return runtime;
};

const yieldNow = function* yieldNowGenerator(): Flow<void> {
  yield { kind: "yield-now" };
};

export { createRuntime, yieldNow };
