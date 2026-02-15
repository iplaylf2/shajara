import type { Blueprint } from "@khora/runtime";
import { cede } from "@khora/runtime/primitives";
import { run } from "@khora/runtime";

function* exampleBlueprint(): ReturnType<Blueprint<string>> {
  yield* cede();

  return "flow resumed after cede";
}

async function main(): Promise<void> {
  await run(exampleBlueprint);
}

main().catch(function rethrow(error: unknown) {
  throw error;
});
