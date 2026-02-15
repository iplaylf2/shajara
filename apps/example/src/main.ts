import { createRuntime, yieldNow } from "@khora/runtime";

const EXPECTED_STEPS = 1;

const main = async (): Promise<void> => {
  const runtime = createRuntime();

  const result = await runtime.run(function* exampleFlow(): Generator<
    { readonly kind: "yield-now" },
    { readonly message: string; readonly steps: number },
    null | unknown
  > {
    yield* yieldNow();

    return {
      message: "flow resumed after yieldNow",
      steps: EXPECTED_STEPS,
    };
  });

  if (result.steps !== EXPECTED_STEPS) {
    throw new Error("Unexpected runtime example result");
  }
};

main().catch((error: unknown) => {
  throw error;
});
