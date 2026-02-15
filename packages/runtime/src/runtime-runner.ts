import type { FlowFactory } from "./flow";
import { allocateScope, drainScopeInputs } from "./runtime-state";
import type { RuntimeState } from "./runtime-state";

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

export { runFlow };
