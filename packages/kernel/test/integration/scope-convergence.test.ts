import { branch, cancel, cede, defer, externalFailure, halt, park, spawn } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, recordTrace } from "#test/harness";
import { noop } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ integration: scope convergence", () => {
  test.for([
    {
      given: {
        childCleanup: "child cleanup",
        detachedCleanup: "detached cleanup",
        parentCleanup: "parent cleanup",
      },
      outcome: ["child cleanup", "parent cleanup", "detached cleanup"] as const,
    },
  ])(
    "cancels child scopes before structural and detached processes",
    async ({ given, outcome }) => {
      const events: string[] = [];

      await using ritual = interpretRitual(() =>
        pipe(
          defer(traceCleanup(events, given.parentCleanup)),
          wisp.chain(() => branch(parkedWithCleanup(events, given.childCleanup))),
          wisp.chain(() => spawn(parkedWithCleanup(events, given.detachedCleanup), DETACHED)),
          wisp.chain(() => cede()),
          wisp.chain(cancel),
        ),
      );
      await ritual.waitForClosed();

      expect(events).toEqual(outcome);
    },
  );

  test.for([
    {
      given: {
        childCleanup: "child cleanup",
        detachedCleanup: "detached cleanup",
        parentCleanup: "parent cleanup",
      },
      outcome: ["child cleanup", "parent cleanup", "detached cleanup"] as const,
    },
  ])("fails child scopes before structural and detached processes", async ({ given, outcome }) => {
    const events: string[] = [];
    const failure = externalFailure("failed", "scope failed");

    await using ritual = interpretRitual(() =>
      pipe(
        defer(traceCleanup(events, given.parentCleanup)),
        wisp.chain(() => branch(parkedWithCleanup(events, given.childCleanup))),
        wisp.chain(() => spawn(parkedWithCleanup(events, given.detachedCleanup), DETACHED)),
        wisp.chain(() =>
          spawn(() =>
            pipe(
              cede(),
              wisp.chain(() => halt(failure)),
            ),
          ),
        ),
        wisp.chain(() => park()),
      ),
    );
    await ritual.waitForClosed();

    expect(events).toEqual(outcome);
  });
});

function parkedWithCleanup(events: string[], label: string) {
  return () =>
    pipe(
      defer(traceCleanup(events, label)),
      wisp.chain(() => park()),
    );
}

function traceCleanup(events: string[], label: string) {
  return () => pipe(recordTrace(events, label), wisp.map(noop));
}

const DETACHED = { completionMode: "detached" } as const;
