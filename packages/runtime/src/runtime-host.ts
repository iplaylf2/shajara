import type { RuntimeBlueprint } from "./blueprint";
import { runBlueprint } from "./runtime-runner";

function run<ReturnValue>(runtimeBlueprint: RuntimeBlueprint<ReturnValue>): Promise<ReturnValue> {
  return runBlueprint(runtimeBlueprint);
}

export { run };
