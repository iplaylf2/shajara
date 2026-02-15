import { ROOT_SCOPE_HANDLE, clearScopeInputs } from "./runtime-state";
import type { Blueprint } from "./blueprint";

function runBlueprint<ReturnValue>(
  blueprint: Blueprint<ReturnValue>,
): Promise<ReturnValue> {
  const blueprintIterator = blueprint();
  let resumeValue: null | unknown = null;

  async function stepRuntime(): Promise<ReturnValue> {
    const stepResult = blueprintIterator.next(resumeValue);
    if (stepResult.done) {
      return stepResult.value;
    }

    if (stepResult.value.kind !== "cede") {
      throw new Error("Unsupported runtime instruction");
    }

    await Promise.resolve();
    clearScopeInputs(ROOT_SCOPE_HANDLE);
    resumeValue = null;
    return stepRuntime();
  }

  return stepRuntime();
}

export { runBlueprint };
