import type { RuntimeBlueprint } from "#src/contracts";
import { assertNever } from "#src/utils/assert-never";
import { ensureExecutor } from "@khora/kernel";
import { lowerBlueprint } from "#src/adapter/plan-lower";

export function run<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  const execution = ensureExecutor().launch(lowerBlueprint(runtimeBlueprint));
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
