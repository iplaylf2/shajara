import type { ExecutionHandle } from "@khora/kernel";

export function awaitExecution<ReturnValue>(
  execution: ExecutionHandle<ReturnValue>,
): Promise<ReturnValue> {
  return new Promise<ReturnValue>((resolve, reject) => {
    execution.future.onSettle((result) => {
      switch (result.kind) {
        case "ok":
          resolve(result.value);
          break;
        case "err":
          reject(result.error);
          break;
      }
    });
  });
}
