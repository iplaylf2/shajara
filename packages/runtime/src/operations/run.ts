import type { RuntimeBlueprint } from "#src/contracts";
import { lowerBlueprint } from "#src/adapter/plan-lower";
import { notImplemented } from "#src/internal/not-implemented";

export function run<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  lowerBlueprint(runtimeBlueprint);
  return notImplemented("runtime execution bridge for RuntimeBlueprint<ReturnValue>");
}
