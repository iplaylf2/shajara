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
      outcome: "same-error",
    },
  ])("fromFailure preserves external Error instances", ({ given: [cause] }) => {
    expect(fromFailure(toFailure(cause))).toBe(cause);
  });

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
