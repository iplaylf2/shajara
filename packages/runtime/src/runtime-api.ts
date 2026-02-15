import type { FlowFactory } from "./flow";
import { runFlow } from "./runtime-runner";
import {
  createRuntimeState,
  enqueueScopeInput,
} from "./runtime-state";
import type { ScopeHandle } from "./runtime-state";

interface Runtime {
  post(scopeHandle: ScopeHandle, inputValue: unknown): void;
  run<ReturnValue>(flowFactory: FlowFactory<ReturnValue>): Promise<ReturnValue>;
}

const createRuntime = (): Runtime => {
  const runtimeState = createRuntimeState();

  const runtime: Runtime = {
    post: (scopeHandle: ScopeHandle, inputValue: unknown): void => {
      enqueueScopeInput(runtimeState, scopeHandle, inputValue);
    },
    run: <ReturnValue>(flowFactory: FlowFactory<ReturnValue>): Promise<ReturnValue> =>
      runFlow(runtimeState, flowFactory),
  };

  return runtime;
};

export type { Runtime };
export { createRuntime };
