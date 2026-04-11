import type { CanceledFailure, SelfHandle } from "#/index";
import { canceledFailure, externalFailure, interruptedFailure, scopeFailure, self } from "#/index";
import { describe, expect, test } from "vitest";
import { interpretRitual, unwrapExitedSucceeded } from "#test/harness";

describe("/ failures", () => {
  test.for([
    {
      given: [
        {
          build: interruptedFailure,
          expect: interruptedFailure,
          input: { reason: "interrupt" },
        },
      ] as const,
    },
    {
      given: [
        {
          build: (raw: unknown) => externalFailure(raw, "mapped into failure"),
          expect: (raw: unknown) => externalFailure(raw, "mapped into failure"),
          input: "raw-external",
        },
      ] as const,
    },
  ])(
    "exposes stable public failure shapes for direct constructor helpers",
    ({ given: [{ build, expect: expectation, input }] }) => {
      const actual = build(input);

      expect(actual).toEqual(expectation(input));
    },
  );

  test.for([
    {
      outcome: {
        kind: "canceled",
        message: "Canceled before completion",
      },
    },
  ])("exports the canonical canceled failure singleton", ({ outcome }) => {
    expect(canceledFailure).toEqual(outcome);
  });

  test.for([
    {
      given: [
        (handle: SelfHandle, suppressed: readonly CanceledFailure[]) =>
          scopeFailure(
            {
              failure: interruptedFailure("scope-broke"),
              kind: "scope",
              scope: handle.scope,
            },
            suppressed,
          ),
      ] as const,
      outcome: {
        cause: expect.objectContaining({
          failure: interruptedFailure("scope-broke"),
          kind: "scope",
        }),
        suppressed: [canceledFailure],
      },
    },
    {
      given: [
        (handle: SelfHandle, suppressed: readonly CanceledFailure[]) =>
          scopeFailure(
            {
              failure: externalFailure("process-broke", "process failed"),
              kind: "process",
              process: handle.process,
            },
            suppressed,
          ),
      ] as const,
      outcome: {
        cause: expect.objectContaining({
          failure: externalFailure("process-broke", "process failed"),
          kind: "process",
        }),
        suppressed: [canceledFailure],
      },
    },
  ])(
    "scopeFailure preserves the provided cause and suppressed failures",
    async ({ given: [build], outcome }) => {
      await using ritual = interpretRitual(() => self());
      const handle = unwrapExitedSucceeded(ritual.driveSync());
      const failure = build(handle, outcome.suppressed);

      expect(failure).toEqual(
        expect.objectContaining({
          ...scopeFailure(failure.cause, outcome.suppressed),
          cause: outcome.cause,
        }),
      );
    },
  );
});
