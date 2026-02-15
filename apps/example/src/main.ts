import { cede, run } from "@khora/runtime";
import type { Blueprint } from "@khora/runtime";

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
