import type { Blueprint } from "@khora/kernel";
import type { RuntimeBlueprint } from "#src/contracts";

interface BlueprintBridge {
  lower<ReturnValue>(blueprint: Blueprint<ReturnValue>): RuntimeBlueprint<ReturnValue>;
  raise<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Blueprint<ReturnValue>;
}

function lowerBlueprint<ReturnValue>(
  _blueprint: Blueprint<ReturnValue>,
): RuntimeBlueprint<ReturnValue> {
  throw new Error(
    "Not implemented: lowering kernel Blueprint<ReturnValue> to RuntimeBlueprint<ReturnValue>.",
  );
}

function raiseBlueprint<ReturnValue>(
  _runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Blueprint<ReturnValue> {
  throw new Error(
    "Not implemented: raising RuntimeBlueprint<ReturnValue> to kernel Blueprint<ReturnValue>.",
  );
}

const BLUEPRINT_BRIDGE: BlueprintBridge = {
  lower: lowerBlueprint,
  raise: raiseBlueprint,
};

export { BLUEPRINT_BRIDGE };
