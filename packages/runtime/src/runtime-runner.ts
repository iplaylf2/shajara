import { BLUEPRINT_BRIDGE } from "./blueprint";
import type { RuntimeBlueprint } from "./blueprint";
import { withRuntimeResolvers } from "./runtime-host-adapter";

function runBlueprint<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Promise<ReturnValue> {
  withRuntimeResolvers<ReturnValue>();

  BLUEPRINT_BRIDGE.raise(runtimeBlueprint);
  throw new Error(
    "Not implemented: runtime execution bridge for RuntimeBlueprint<ReturnValue>.",
  );
}

export { runBlueprint };
