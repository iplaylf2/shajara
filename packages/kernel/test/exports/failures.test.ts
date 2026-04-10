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
          input: { reason: "interrupt" },
        },
      ] as const,
      outcome: {
        cause: { reason: "interrupt" },
        kind: "interrupted",
        message: "Scope progression was interrupted by an out-of-band failure",
      },
    },
    {
      given: [
        {
          build: (raw: unknown) => externalFailure(raw, "mapped into failure"),
          input: "raw-external",
        },
      ] as const,
      outcome: {
        kind: "external",
        message: "mapped into failure",
        raw: "raw-external",
      },
    },
  ])(
    "exposes stable public failure shapes for direct constructor helpers",
    ({ given: [{ build, input }], outcome }) => {
      const actual = build(input);

      expect(actual).toEqual(outcome);
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
          failure: expect.objectContaining({
            cause: "scope-broke",
            kind: "interrupted",
            message: "Scope progression was interrupted by an out-of-band failure",
          }),
          kind: "scope",
        }),
        kind: "scope",
        message: "Scope failed during closing",
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
          failure: expect.objectContaining({
            kind: "external",
            message: "process failed",
            raw: "process-broke",
          }),
          kind: "process",
        }),
        kind: "scope",
        message: "Scope failed during closing",
        suppressed: [canceledFailure],
      },
    },
  ])(
    "scopeFailure preserves the provided cause and suppressed failures",
    async ({ given: [build], outcome }) => {
      await using ritual = interpretRitual(() => self());
      const handle = unwrapExitedSucceeded(ritual.driveSync());
      const failure = build(handle, outcome.suppressed);

      expect(failure).toEqual(outcome);
    },
  );
});
