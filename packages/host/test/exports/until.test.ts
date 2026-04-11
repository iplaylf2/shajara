import { ScopeError, run, until } from "#/index";
import { describe, expect, test } from "vitest";

describe("/ operations: until", () => {
  test.for([
    {
      given: ["settled"] as const,
      outcome: "settled",
    },
  ])("returns the fulfilled value from the promise thunk", async ({ given: [value], outcome }) => {
    const settled = run(() => until(() => Promise.resolve(value)));

    await expect(settled).resolves.toBe(outcome);
  });

  test.for([
    {
      given: [new Error("until-failed")] as const,
      outcome: {
        cause: {
          failure: {
            kind: "external",
          },
          kind: "process",
        },
        kind: "scope",
      } as const,
    },
  ])("preserves rejected Error instances", async ({ given: [cause], outcome }) => {
    const settled = run(() => until(() => Promise.reject(cause)));

    const actual = await Promise.resolve(settled).catch((error: unknown) => error);

    expect(actual).toBeInstanceOf(ScopeError);
    expect(actual).toMatchObject({
      ...outcome,
      cause: {
        ...outcome.cause,
        failure: {
          ...outcome.cause.failure,
          raw: cause,
        },
      },
    });
  });

  test.for([
    {
      given: ["until-failed"] as const,
      outcome: {
        message: "until-failed",
        raw: "until-failed",
      },
    },
  ])("wraps non-Error rejections as ExternalError", async ({ given: [cause], outcome }) => {
    const settled = run(() => until(() => Promise.reject(cause)));

    const actual = await Promise.resolve(settled).catch((error: unknown) => error);

    expect(actual).toBeInstanceOf(ScopeError);
    expect(actual).toMatchObject({
      cause: {
        failure: {
          kind: "external",
          message: outcome.message,
          name: "ExternalError",
          raw: outcome.raw,
        },
        kind: "process",
      },
      kind: "scope",
    });
  });
});
