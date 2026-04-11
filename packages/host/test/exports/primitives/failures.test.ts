import { CanceledError, ScopeError, run } from "#/index";
import { cancel, enclose, future, halt, settleError, wait } from "#/primitives";
import { describe, expect, test } from "vitest";

describe("/ primitives: cancel, halt, settleError", () => {
  test.for([
    {
      given: [] as const,
      outcome: {
        kind: "canceled",
      } as const,
    },
  ])("cancel rejects the current scope with CanceledError", async ({ outcome }) => {
    const settled = run(function* cancelCurrentScope() {
      yield* cancel();
    });

    await expect(settled).rejects.toBeInstanceOf(CanceledError);
    await expect(settled).rejects.toMatchObject(outcome);
  });

  test.for([
    {
      given: [new Error("halted for test")] as const,
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
  ])("enclose surfaces halt failures as scope failures", async ({ given: [cause], outcome }) => {
    const settled = run(function* awaitHaltedEnclosure() {
      return yield* enclose(function* haltChildScope() {
        yield* halt(cause);
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
