import { defer, enclose, future, settle, wait } from "#/index";
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
    ({ given: [bodyEntry, cleanupEntry], outcome }) => {
      const step = interpretRitual(() =>
        pipe(
          wisp.Do,
          wisp.bind("events", () => wisp.of<string[]>([])),
          wisp.bind("cleanupHandle", () => future<readonly string[]>()),
          wisp.bind("scopeExit", ({ cleanupHandle: [, cleanupSettle], events }) =>
            enclose(() =>
              pipe(
                defer(() =>
                  pipe(
                    record(events, cleanupEntry),
                    wisp.chain((snapshot) => settle(cleanupSettle, right(snapshot))),
                  ),
                ),
                wisp.chain(() => record(events, bodyEntry)),
              ),
            ),
          ),
          wisp.bind("cleanup", ({ cleanupHandle: [cleanupFuture] }) => wait(cleanupFuture)),
          wisp.map(({ cleanup, scopeExit }) => ({
            cleanup,
            scopeExit,
          })),
        ),
      ).driveSync();
      const actual = unwrapRight(unwrapExited(step));

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
