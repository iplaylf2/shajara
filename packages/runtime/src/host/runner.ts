import { BLUEPRINT_BRIDGE } from "#src/bridge/blueprint";
import type { RuntimeBlueprint } from "#src/bridge/blueprint";
import { withRuntimeResolvers } from "./adapter";

function runBlueprint<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  withRuntimeResolvers<ReturnValue>();

  BLUEPRINT_BRIDGE.raise(runtimeBlueprint);
  throw new Error("Not implemented: runtime execution bridge for RuntimeBlueprint<ReturnValue>.");
}

export { runBlueprint };
