import { defer, enclose, future, settle, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { pipe } from "fp-ts/function";
import { right } from "#/utils";
import { wisp } from "#/internal/fp";

describe("@shajara/kernel . defer", () => {
  test.for([
    {
      expect: {
        cleanup: right(["body", "cleanup"]),
        scopeExit: right(["body"]),
      },
      input: () =>
        pipe(
          wisp.Do,
          wisp.bind("events", () => wisp.of<string[]>([])),
          wisp.bind("cleanupHandle", () => future<readonly string[]>()),
          wisp.bind("scopeExit", ({ cleanupHandle: [, cleanupSettle], events }) =>
            enclose(() =>
              pipe(
                defer(() =>
                  pipe(
                    record(events, "cleanup"),
                    wisp.chain((snapshot) => settle(cleanupSettle, right(snapshot))),
                  ),
                ),
                wisp.chain(() => record(events, "body")),
              ),
            ),
          ),
          wisp.bind("cleanup", ({ cleanupHandle: [cleanupFuture] }) => wait(cleanupFuture)),
          wisp.map(({ cleanup, scopeExit }) => ({
            cleanup,
            scopeExit,
          })),
        ),
    },
  ])("runs cleanup after the enclosed process exits", ({ input, expect: expected }) => {
    const step = interpretRitual(input).driveSync();
    const actual = unwrapRight(unwrapExited(step));

    expect(actual).toEqual(expected);
  });
});

function record(events: string[], entry: string) {
  return wisp.fromIO(() => {
    events.push(entry);
    return [...events] as readonly string[];
  });
}
