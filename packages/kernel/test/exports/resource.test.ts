import {
  cancel,
  canceledFailure,
  defer,
  enclose,
  future,
  resource,
  settle,
  spawn,
  wait,
} from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { left, right } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("@shajara/kernel . resource", () => {
  test.for([
    {
      expect: right("resource-ready"),
      input: () =>
        pipe(
          resource<string>((provide) => provide("resource-ready")),
          wisp.chain(wait),
        ),
    },
  ])("settles its future when the provider exposes a value", ({ input, expect: expected }) => {
    const step = interpretRitual(input).driveSync();
    const actual = unwrapRight(unwrapExited(step));

    expect(actual).toEqual(expected);
  });

  test.for([
    {
      expect: {
        lifecycleTrace: right(["provided", "cleanup"]),
        scopeExit: left(canceledFailure),
      },
      input: () =>
        pipe(
          wisp.Do,
          wisp.bind("events", () => wisp.of<string[]>([])),
          wisp.bind("lifecycleHandle", () => future<readonly string[]>()),
          wisp.bind("scopeExit", ({ lifecycleHandle: [, lifecycleSettle], events }) =>
            enclose(() =>
              pipe(
                resource<string>((provide) =>
                  pipe(
                    defer(() =>
                      pipe(
                        record(events, "cleanup"),
                        wisp.chain((snapshot) => settle(lifecycleSettle, right(snapshot))),
                      ),
                    ),
                    wisp.chain(() => record(events, "provided")),
                    wisp.chain(() => provide("resource-ready")),
                  ),
                ),
                wisp.chainFirst((resourceFuture) =>
                  spawn(() =>
                    pipe(
                      wait(resourceFuture),
                      wisp.chain(() => cancel()),
                    ),
                  ),
                ),
                wisp.chain(wait),
              ),
            ),
          ),
          wisp.bind("lifecycleTrace", ({ lifecycleHandle: [lifecycleFuture] }) =>
            wait(lifecycleFuture),
          ),
          wisp.map(({ lifecycleTrace, scopeExit }) => ({
            lifecycleTrace,
            scopeExit,
          })),
        ),
    },
  ])(
    "remains attached to the scope until cancellation triggers deferred cleanup",
    ({ input, expect: expected }) => {
      const step = interpretRitual(input).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(expected);
    },
  );
});

function record(events: string[], entry: string) {
  return wisp.fromIO(() => {
    events.push(entry);
    return [...events] as readonly string[];
  });
}
