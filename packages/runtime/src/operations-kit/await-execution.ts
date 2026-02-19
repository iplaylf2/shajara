import type { ExecutionHandle } from "@khora/kernel";
import { assertNever } from "#src/utils/assert-never";

export function awaitExecution<ReturnValue>(
  execution: ExecutionHandle<ReturnValue>,
): Promise<ReturnValue> {
  return new Promise<ReturnValue>((resolve, reject) => {
    execution.future.onSettle((result) => {
      switch (result.kind) {
        case "ok":
          resolve(result.value);
          return;
        case "err":
          reject(result.error);
          return;
        default:
          assertNever(result);
      }
    });
  });
}
