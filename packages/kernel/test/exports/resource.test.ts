import { cancel, canceledFailure, defer, enclose, resource, spawn, wait } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, recordTrace, unwrapExitedSucceeded } from "#test/harness";
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
    async ({ given: [resourceValue], outcome }) => {
      await using ritual = interpretRitual(() =>
        pipe(
          resource<string>((provide) => provide(resourceValue)),
          wisp.chainFirst(() => spawn(cancel)),
        ),
      );
      const step = ritual.driveSync();
      const resourceFuture = unwrapExitedSucceeded(step);
      const actual = await ritual.waitForFuture(resourceFuture);

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
    async ({ given: [providedEntry, cleanupEntry, resourceValue], outcome }) => {
      const events: string[] = [];

      await using ritual = interpretRitual(() =>
        enclose(() =>
          pipe(
            resource<string>((provide) =>
              pipe(
                defer(() =>
                  pipe(
                    recordTrace(events, cleanupEntry),
                    wisp.map(() => undefined),
                  ),
                ),
                wisp.chain(() => recordTrace(events, providedEntry)),
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
      );
      const step = await ritual.waitForClosed();
      const actual = {
        lifecycleTrace: right([...events] as readonly string[]),
        scopeExit: unwrapExitedSucceeded(step),
      };

      expect(actual).toEqual(outcome);
    },
  );
});
