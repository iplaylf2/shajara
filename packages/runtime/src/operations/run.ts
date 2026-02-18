import type { RuntimeBlueprint } from "#src/contracts";
import { lowerBlueprint } from "#src/adapter/plan-lower";

export function run<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  lowerBlueprint(runtimeBlueprint);
  throw new Error("Not implemented: runtime execution bridge for RuntimeBlueprint<ReturnValue>.");
}
