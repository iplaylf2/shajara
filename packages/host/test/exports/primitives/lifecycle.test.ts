import { defer, enclose } from "#/primitives";
import { describe, expect, test } from "vitest";
import { run } from "#/index";

describe("/ primitives: defer", () => {
  test.for([
    {
      given: ["body", "cleanup"] as const,
      outcome: {
        cleanup: ["body", "cleanup"],
        result: ["body"],
      },
    },
    {
      given: ["body", "cleanup:1", "cleanup:2"] as const,
      outcome: {
        cleanup: ["body", "cleanup:1", "cleanup:2"],
        result: ["body"],
      },
    },
  ])(
    "runs deferred cleanups in registration order after the enclosed process exits",
    async ({ given, outcome }) => {
      const [bodyEntry, firstCleanup, secondCleanup] = given;
      const events: string[] = [];
      const settled = run(function* awaitDeferredCleanup() {
        return yield* enclose(function* runWithDeferredCleanup() {
          yield* defer(function* runFirstCleanup() {
            events.push(firstCleanup);
          });

          if (secondCleanup !== undefined) {
            yield* defer(function* runSecondCleanup() {
              events.push(secondCleanup);
            });
          }

          events.push(bodyEntry);
          return [...events] as const;
        });
      });

      await expect(settled).resolves.toEqual(outcome.result);
      expect(events).toEqual(outcome.cleanup);
    },
  );
});
