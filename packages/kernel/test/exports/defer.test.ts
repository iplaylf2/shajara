import { defer, enclose } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, recordTrace, unwrapExitedSucceeded } from "#test/harness";
import { pipe } from "fp-ts/function";
import { right } from "#/utils";
import { wisp } from "#/internal/fp";

describe("/ primitives: defer", () => {
  test.for([
    {
      given: ["body", "cleanup"] as const,
      outcome: {
        cleanup: right(["body", "cleanup"]),
        scopeExit: right(["body"]),
      },
    },
  ])(
    "runs cleanup after the enclosed process exits",
    async ({ given: [bodyEntry, cleanupEntry], outcome }) => {
      const events: string[] = [];

      await using ritual = interpretRitual(() =>
        enclose(() =>
          pipe(
            defer(() =>
              pipe(
                recordTrace(events, cleanupEntry),
                wisp.map(() => undefined),
              ),
            ),
            wisp.chain(() => recordTrace(events, bodyEntry)),
          ),
        ),
      );
      const step = ritual.driveSync();
      const actual = {
        cleanup: right([...events] as readonly string[]),
        scopeExit: unwrapExitedSucceeded(step),
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["body", "cleanup:1", "cleanup:2"] as const,
      outcome: {
        cleanup: right(["body", "cleanup:1", "cleanup:2"]),
        scopeExit: right(["body"]),
      },
    },
  ])(
    "runs multiple cleanups in registration order after the enclosed process exits",
    async ({ given: [bodyEntry, firstCleanupEntry, secondCleanupEntry], outcome }) => {
      const events: string[] = [];

      await using ritual = interpretRitual(() =>
        enclose(() =>
          pipe(
            defer(() =>
              pipe(
                recordTrace(events, firstCleanupEntry),
                wisp.map(() => undefined),
              ),
            ),
            wisp.chain(() =>
              defer(() =>
                pipe(
                  recordTrace(events, secondCleanupEntry),
                  wisp.map(() => undefined),
                ),
              ),
            ),
            wisp.chain(() => recordTrace(events, bodyEntry)),
          ),
        ),
      );
      const step = ritual.driveSync();
      const actual = {
        cleanup: right([...events] as readonly string[]),
        scopeExit: unwrapExitedSucceeded(step),
      };

      expect(actual).toEqual(outcome);
    },
  );
});
