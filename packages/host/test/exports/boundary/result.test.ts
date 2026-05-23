import { OperationContextError, UnfulfilledError } from "#/index";
import { describe, expect, test } from "vitest";
import { fromFailure, toFailure, unwrapEither, unwrapOption } from "#/boundary";
import { none, right, some } from "@shajara/kernel/utils";
import { externalFailure } from "@shajara/kernel";

describe("/ boundary: fromFailure, toFailure, unwrapEither, unwrapOption", () => {
  test.for([
    {
      given: [new Error("failed")] as const,
      outcome: {
        kind: "external",
      },
    },
  ])("toFailure maps JavaScript errors into external failures", ({ given: [cause], outcome }) => {
    const failure = toFailure(cause);

    expect(failure).toMatchObject({
      ...outcome,
      raw: cause,
    });
  });

  test.for([
    {
      given: [new Error("failed")] as const,
      outcome: {
        sameInstance: true,
      },
    },
  ])("fromFailure preserves external Error instances", ({ given: [cause], outcome }) => {
    expect(fromFailure(toFailure(cause)) === cause).toBe(outcome.sameInstance);
  });

  test.for([
    {
      given: [new OperationContextError()] as const,
      outcome: {
        kind: "external",
      },
    },
  ])(
    "toFailure maps operation context errors into external failures",
    ({ given: [cause], outcome }) => {
      const failure = toFailure(cause);

      expect(failure).toMatchObject({
        kind: outcome.kind,
        raw: cause,
      });
    },
  );

  test.for([
    {
      given: ["raw", "failed"] as const,
      outcome: {
        kind: "external",
        raw: "raw",
      },
    },
  ])("fromFailure wraps non-Error external failures", ({ given: [raw, message], outcome }) => {
    expect(fromFailure(externalFailure(raw, message))).toMatchObject(outcome);
  });

  test.for([
    {
      given: [
        {
          kind: "unfulfilled",
          message: "Future was not fulfilled before its owner scope closed",
        },
      ] as const,
      outcome: {
        error: UnfulfilledError,
        kind: "unfulfilled",
        message: "Future was not fulfilled before its owner scope closed",
      } as const,
    },
  ])(
    "fromFailure maps unfulfilled failures into UnfulfilledError",
    ({ given: [failure], outcome }) => {
      const error = fromFailure(failure);

      expect(error).toBeInstanceOf(outcome.error);
      expect(error).toMatchObject({
        kind: outcome.kind,
        message: outcome.message,
      });
    },
  );

  test.for([
    {
      given: ["value"] as const,
      outcome: "value",
    },
  ])("unwrapEither returns right values", ({ given: [value], outcome }) => {
    expect(unwrapEither(right(value))).toBe(outcome);
  });

  test.for([
    {
      given: [some("present")] as const,
      outcome: [true, "present"],
    },
    {
      given: [none] as const,
      outcome: [false],
    },
  ])("unwrapOption maps options into host presence tuples", ({ given: [option], outcome }) => {
    expect(unwrapOption(option)).toEqual(outcome);
  });
});
