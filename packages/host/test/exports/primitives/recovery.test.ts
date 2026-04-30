import { describe, expect, test } from "vitest";
import { guard, resumable, wait } from "#/primitives";
import type { ScopeError } from "#/index";
import { findFailureByKind } from "#test/harness";
import { run } from "#/index";

describe("/ primitives: guard, resumable", () => {
  test.for([
    {
      given: [new Error("failed without guard")] as const,
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
        const unrecoveredResult = yield* resumable(function* failWithoutRecovery() {
          throw cause;
        });

        return yield* wait(unrecoveredResult);
      });

      const actual = await settled.catch((error: unknown) => error);

      expect(actual).toMatchObject(outcome);
    },
  );

  test.for([
    {
      given: [new Error("failed for recovery"), "recovered:failed"] as const,
      outcome: {
        recovered: "recovered:failed",
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
        const recoveredResult = yield* guard(
          function* runGuardedEntry() {
            const recoverableResult = yield* resumable(function* failRecoverableScope() {
              throw cause;
            });

            return yield* wait(recoverableResult);
          },
          function* recoverResumable(error) {
            captured.resolve(error);
            return recovered;
          },
        );

        return yield* wait(recoveredResult);
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

  test.for([
    {
      given: [new Error("failed before recovery"), new Error("recovery-handler-failed")] as const,
      outcome: {
        external: {
          kind: "external",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "guard fails with the recovery handler error when recovery throws",
    async ({ given: [entryCause, recoveryCause], outcome }) => {
      const settled = run(function* awaitFailedRecovery() {
        const failedRecovery = yield* guard(
          function* runGuardedEntry() {
            const recoverableResult = yield* resumable(function* failRecoverableScope() {
              throw entryCause;
            });

            return yield* wait(recoverableResult);
          },
          function* throwFromRecovery() {
            throw recoveryCause;
          },
        );

        return yield* wait(failedRecovery);
      });

      const actual = await settled.catch((error: unknown) => error);

      expect(actual).toMatchObject({ kind: outcome.kind });
      expect(findFailureByKind(actual, "external")).toMatchObject({
        ...outcome.external,
        raw: recoveryCause,
      });
    },
  );
});
