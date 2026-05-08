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
        childCleanupEnd: "child cleanup:end",
        childCleanupStart: "child cleanup:start",
        detachedCleanup: "detached cleanup",
        parentCleanupEnd: "parent cleanup:end",
        parentCleanupStart: "parent cleanup:start",
      },
      outcome: [
        "child cleanup:start",
        "child cleanup:end",
        "parent cleanup:start",
        "parent cleanup:end",
        "detached cleanup",
      ] as const,
    },
  ])(
    "drains child scopes before structural and detached processes during cancellation",
    async ({ given, outcome }) => {
      const events: string[] = [];

      await using ritual = interpretRitual(() =>
        pipe(
          defer(delayedTraceCleanup(events, given.parentCleanupStart, given.parentCleanupEnd)),
          wisp.chain(() =>
            branch(
              parkedWithDelayedCleanup(events, given.childCleanupStart, given.childCleanupEnd),
            ),
          ),
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
        childCleanupEnd: "child cleanup:end",
        childCleanupStart: "child cleanup:start",
        detachedCleanup: "detached cleanup",
        parentCleanupEnd: "parent cleanup:end",
        parentCleanupStart: "parent cleanup:start",
      },
      outcome: [
        "child cleanup:start",
        "child cleanup:end",
        "parent cleanup:start",
        "parent cleanup:end",
        "detached cleanup",
      ] as const,
    },
  ])(
    "drains child scopes before structural and detached processes during failure",
    async ({ given, outcome }) => {
      const events: string[] = [];
      const failure = externalFailure("failed", "scope failed");

      await using ritual = interpretRitual(() =>
        pipe(
          defer(delayedTraceCleanup(events, given.parentCleanupStart, given.parentCleanupEnd)),
          wisp.chain(() =>
            branch(
              parkedWithDelayedCleanup(events, given.childCleanupStart, given.childCleanupEnd),
            ),
          ),
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
    },
  );
});

function parkedWithCleanup(events: string[], label: string) {
  return () =>
    pipe(
      defer(traceCleanup(events, label)),
      wisp.chain(() => park()),
    );
}

function parkedWithDelayedCleanup(events: string[], start: string, end: string) {
  return () =>
    pipe(
      defer(delayedTraceCleanup(events, start, end)),
      wisp.chain(() => park()),
    );
}

function delayedTraceCleanup(events: string[], start: string, end: string) {
  return () =>
    pipe(
      recordTrace(events, start),
      wisp.chain(() => cede()),
      wisp.chain(() => recordTrace(events, end)),
      wisp.map(noop),
    );
}

function traceCleanup(events: string[], label: string) {
  return () => pipe(recordTrace(events, label), wisp.map(noop));
}

const DETACHED = { completionMode: "detached" } as const;
