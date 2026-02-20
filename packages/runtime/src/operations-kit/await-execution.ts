import type { ExecutionResult, ExecutionScope } from "@khora/kernel";
import { RuntimeScopeInterruptedError } from "#src/errors/runtime-scope-interrupted";

export function awaitExecution<ReturnValue>(
  execution: ExecutionScope<ReturnValue>,
): Promise<ReturnValue> {
  return new Promise<ReturnValue>((resolve, reject) => {
    const settle = (result: ExecutionResult<ReturnValue>): void => {
      switch (result.kind) {
        case "success":
          resolve(result.value);
          break;
        case "failure":
          reject(result.reason);
          break;
        case "interruption":
          reject(new RuntimeScopeInterruptedError());
          break;
      }
    };

    execution.result.onResult((result) => {
      settle(result);
    });
  });
}
