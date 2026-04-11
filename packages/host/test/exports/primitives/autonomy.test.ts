import { autonomy, wait } from "#/primitives";
import { describe, expect, test } from "vitest";
import { run } from "#/index";

describe("/ primitives: autonomy", () => {
  test.for([
    {
      given: ["autonomy-ready"] as const,
      outcome: "autonomy-ready",
    },
  ])(
    "returns a future whose result resolves from the autonomous ritual",
    async ({ given: [value], outcome }) => {
      const settled = run(function* awaitAutonomousResult() {
        const future = yield* autonomy(
          function* runAutonomousEntry() {
            return value;
          },
          {
            reaper: keepWaiting,
          },
        );

        return yield* wait(future);
      });

      await expect(settled).resolves.toBe(outcome);
    },
  );
});

function* keepWaiting() {
  // Keep waiting until the autonomous entry settles.
}
