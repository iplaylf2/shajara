import type { RiteCoroutine, ScopeError } from "#/index";
import { describe, expect, test } from "vitest";
import { guard, resumable } from "#/primitives";
import { findFailureByKind } from "#test/harness";
import { run } from "#/index";

describe("/ primitives: guard, resumable", () => {
  test.for([
    {
      given: [new Error("failed without guard")] as const,
      outcome: {
        cause: {
          kind: "external",
        },
        kind: "scope",
      } as const,
    },
  ])(
    "resumable returns the scope failure when no guard recovery boundary is present",
    async ({ given: [cause], outcome }) => {
      const settled = run(function* awaitUnrecoveredResumable() {
        return yield* resumable(function* failWithoutRecovery() {
          throw cause;
        });
      });

      const actual = await settled.catch((error: unknown) => error);

      expect(actual).toMatchObject({
        ...outcome,
        cause: {
          ...outcome.cause,
          raw: cause,
        },
      });
    },
  );

  test.for([
    {
      given: [new Error("failed for recovery"), "recovered:failed"] as const,
      outcome: {
        error: {
          cause: {
            kind: "external",
          },
          kind: "scope",
        },
        value: "recovered:failed",
      } as const,
    },
  ])(
    "guard receives resumable failures as scope errors and applies recovery inside the guarded entry scope",
    async ({ given: [cause, value], outcome }) => {
      const seenError = Promise.withResolvers<ScopeError>();
      const settled = run(function* awaitRecoveredGuard() {
        return yield* guard(
          function* runGuardedEntry() {
            return yield* resumable(function* failRecoverableScope() {
              throw cause;
            });
          },
          function* recoverResumable(error) {
            seenError.resolve(error);
            return [true, value] as const;
          },
        );
      });

      await expect(settled).resolves.toBe(outcome.value);
      await expect(seenError.promise).resolves.toMatchObject({
        ...outcome.error,
        cause: {
          ...outcome.error.cause,
          raw: cause,
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
        return yield* guard(
          function* runGuardedEntry() {
            return yield* resumable(function* failRecoverableScope() {
              throw entryCause;
            });
          },
          function* throwFromRecovery() {
            throw recoveryCause;
          },
        );
      });

      const actual = await settled.catch((error: unknown) => error);

      expect(actual).toMatchObject({ kind: outcome.kind });
      expect(findFailureByKind(actual, "external")).toMatchObject({
        ...outcome.external,
        raw: recoveryCause,
      });
    },
  );

  test.for([
    {
      given: [new Error("failed for nested recovery"), "nested:recovered"] as const,
      outcome: ["nested:recovered"],
    },
  ])(
    "uses the recovery result for the nested resumable rather than the guard return",
    async ({ given: [cause, value], outcome }) => {
      const values: string[] = [];
      const settled = run(function* collectRecoveredValue() {
        yield* guard(
          function* runGuardedEntry() {
            const item = yield* resumable(function* failRecoverableString(): RiteCoroutine<string> {
              throw cause;
            });
            values.push(item);
          },
          function* recoverResumable() {
            return [true, value] as const;
          },
        );

        return values;
      });

      await expect(settled).resolves.toEqual(outcome);
    },
  );

  test.for([
    {
      given: [new Error("failed before delegated recovery"), "delegated:recovered"] as const,
      outcome: "delegated:recovered",
    },
  ])(
    "delegates recovery to an ancestor guard when the handler declines recovery",
    async ({ given: [cause, value], outcome }) => {
      const innerError = Promise.withResolvers<ScopeError>();
      const outerError = Promise.withResolvers<ScopeError>();
      const settled = run(function* recoverFromOuterGuard() {
        return yield* guard(
          function* runOuterEntry() {
            return yield* guard(
              function* runInnerEntry() {
                return yield* resumable(function* failRecoverableScope() {
                  throw cause;
                });
              },
              function* delegateRecovery(error) {
                innerError.resolve(error);
                return [false] as const;
              },
            );
          },
          function* recoverInAncestor(error) {
            outerError.resolve(error);
            return [true, value] as const;
          },
        );
      });

      await expect(settled).resolves.toBe(outcome);
      await expect(innerError.promise).resolves.toMatchObject({ kind: "scope" });
      await expect(outerError.promise).resolves.toMatchObject({ kind: "scope" });
    },
  );
});
