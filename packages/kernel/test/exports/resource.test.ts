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

describe("/ primitives: resource", () => {
  test.for([
    {
      given: ["resource-ready"] as const,
      outcome: right("resource-ready"),
    },
  ])(
    "settles its future when the provider exposes a value",
    ({ given: [resourceValue], outcome }) => {
      const step = interpretRitual(() =>
        pipe(
          resource<string>((provide) => provide(resourceValue)),
          wisp.chain(wait),
        ),
      ).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["provided", "cleanup", "resource-ready"] as const,
      outcome: {
        lifecycleTrace: right(["provided", "cleanup"]),
        scopeExit: left(canceledFailure),
      },
    },
  ])(
    "remains attached to the scope until cancellation triggers deferred cleanup",
    ({ given: [providedEntry, cleanupEntry, resourceValue], outcome }) => {
      const step = interpretRitual(() =>
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
                        record(events, cleanupEntry),
                        wisp.chain((snapshot) => settle(lifecycleSettle, right(snapshot))),
                      ),
                    ),
                    wisp.chain(() => record(events, providedEntry)),
                    wisp.chain(() => provide(resourceValue)),
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
