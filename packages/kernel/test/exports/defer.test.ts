import { defer, enclose } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
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
                record(events, cleanupEntry),
                wisp.map(() => undefined),
              ),
            ),
            wisp.chain(() => record(events, bodyEntry)),
          ),
        ),
      );
      const step = ritual.driveSync();
      const actual = {
        cleanup: right([...events] as readonly string[]),
        scopeExit: unwrapRight(unwrapExited(step)),
      };

      expect(actual).toEqual(outcome);
    },
  );
});

function record(events: string[], entry: string) {
  return wisp.fromIO(() => {
    events.push(entry);
    return [...events] as readonly string[];
  });
}
