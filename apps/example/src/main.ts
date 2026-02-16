import type { RuntimeBlueprint } from "@khora/runtime";
import { cede } from "@khora/runtime/primitives";
import { run } from "@khora/runtime";

function* exampleBlueprint(): ReturnType<RuntimeBlueprint<string>> {
  yield* cede();
  return "flow resumed after cede";
}

run(exampleBlueprint).catch(function rethrow(error: unknown) {
  throw error;
});
