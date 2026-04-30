import { CanceledError, ScopeError, run } from "#/index";
import { describe, expect, test } from "vitest";
import { enclose, future, settleError, wait } from "#/primitives";

describe("/ primitives: thrown termination, settleError", () => {
  test.for([
    {
      given: [] as const,
      outcome: {
        kind: "canceled",
      } as const,
    },
  ])("throwing CanceledError cancels the current scope", async ({ outcome }) => {
    const settled = run(function* throwCancellation() {
      throw new CanceledError();
    });

    await expect(settled).rejects.toBeInstanceOf(CanceledError);
    await expect(settled).rejects.toMatchObject(outcome);
  });

  test.for([
    {
      given: [new Error("failed for test")] as const,
      outcome: {
        cause: {
          failure: {
            kind: "scope",
          },
          kind: "process",
        },
        kind: "scope",
      } as const,
    },
  ])("enclose surfaces thrown errors as scope failures", async ({ given: [cause], outcome }) => {
    const settled = run(function* awaitFailedEnclosure() {
      return yield* enclose(function* failChildScope() {
        throw cause;
      });
    });

    await expect(settled).rejects.toBeInstanceOf(ScopeError);
    await expect(settled).rejects.toMatchObject(outcome);
  });

  test.for([
    {
      given: [new Error("future-failed")] as const,
      outcome: {
        cause: {
          kind: "process",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "settleError causes wait to reject with the original error instance",
    async ({ given: [cause], outcome }) => {
      const settled = run(function* awaitFailedFuture() {
        const [futureKey, futureSettle] = yield* future<string>();

        yield* settleError(futureSettle, cause);
        return yield* wait(futureKey);
      });

      await expect(settled).rejects.toBeInstanceOf(ScopeError);
      await expect(settled).rejects.toMatchObject(outcome);
    },
  );
});
