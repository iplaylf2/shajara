import type { ExecutionResult, ExecutionScope } from "@khora/kernel";
import { RuntimeScopeFailedError } from "#src/errors/runtime-scope-failed";
import { RuntimeScopeInterruptedError } from "#src/errors/runtime-scope-interrupted";

export function executionAsPromise<ReturnValue>(
  execution: ExecutionScope<ReturnValue>,
): Promise<ReturnValue> {
  return new Promise<ReturnValue>((resolve, reject) => {
    execution.result.onResult((result: ExecutionResult<ReturnValue>) => {
      switch (result.kind) {
        case "success":
          resolve(result.value);
          break;
        case "failure":
          reject(new RuntimeScopeFailedError(result.reason));
          break;
        case "interruption":
          reject(new RuntimeScopeInterruptedError());
          break;
      }
    });
  });
}
