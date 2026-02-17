import { BLUEPRINT_BRIDGE } from "#src/blueprint-bridge";
import type { RuntimeBlueprint } from "#src/contracts";

export function run<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  BLUEPRINT_BRIDGE.raise(runtimeBlueprint);
  throw new Error("Not implemented: runtime execution bridge for RuntimeBlueprint<ReturnValue>.");
}
