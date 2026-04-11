import { describe, expect, test } from "vitest";
import { guard, halt, resumable, wait } from "#/primitives";
import type { ScopeError } from "#/index";
import { run } from "#/index";

describe("/ primitives: guard, resumable", () => {
  test.for([
    {
      given: [new Error("halted without guard")] as const,
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
  ])(
    "resumable rejects with a scope failure when no guard recovery boundary is present",
    async ({ given: [cause], outcome }) => {
      const settled = run(function* awaitUnrecoveredResumable() {
        const future = yield* resumable(function* haltWithoutRecovery() {
          yield* halt(cause);
        });

        return yield* wait(future);
      });

      const actual = await Promise.resolve(settled).catch((error: unknown) => error);

      expect(actual).toMatchObject(outcome);
    },
  );

  test.for([
    {
      given: [new Error("halted for recovery"), "recovered:halted"] as const,
      outcome: {
        recovered: "recovered:halted",
        recoveryError: {
          cause: {
            failure: {
              kind: "external",
            },
            kind: "process",
          },
          kind: "scope",
        },
      } as const,
    },
  ])(
    "guard receives resumable failures as scope errors and applies recovery inside the guarded entry scope",
    async ({ given: [cause, recovered], outcome }) => {
      const captured = Promise.withResolvers<ScopeError>();
      const settled = run(function* awaitRecoveredGuard() {
        const guardFuture = yield* guard(
          function* runGuardedEntry() {
            const resumableFuture = yield* resumable(function* haltRecoverableScope() {
              yield* halt(cause);
            });

            return yield* wait(resumableFuture);
          },
          function* recoverResumable(error) {
            captured.resolve(error);
            return recovered;
          },
        );

        return yield* wait(guardFuture);
      });

      await expect(settled).resolves.toBe(outcome.recovered);
      await expect(captured.promise).resolves.toMatchObject({
        ...outcome.recoveryError,
        cause: {
          ...outcome.recoveryError.cause,
          failure: {
            ...outcome.recoveryError.cause.failure,
            raw: cause,
          },
        },
      });
    },
  );
});
