import { CanceledError, ScopeError, run, until } from "#/index";
import type { RiteCoroutine, ScopeExitError } from "#/index";
import { describe, expect, test } from "vitest";
import { guard, resumable } from "#/primitives";
import { findFailureByKind } from "#test/harness";

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
      given: [new Error("failed for recovery"), failByThrowing, "recovered:failed"] as const,
      outcome: {
        error: {
          cause: {
            kind: "external",
          },
          kind: "scope",
        },
      } as const,
    },
    {
      given: [
        new Error("rejected for recovery"),
        failByRejectedPromise,
        "recovered:rejected",
      ] as const,
      outcome: {
        error: {
          cause: {
            kind: "external",
          },
          kind: "scope",
        },
      } as const,
    },
  ])(
    "guard receives scope exit errors as recovery causes",
    async ({ given: [cause, failRecoverable, value], outcome }) => {
      const seenError = Promise.withResolvers<ScopeExitError>();
      const settled = run(function* awaitRecoveredGuard() {
        return yield* guard(
          function* runGuardedEntry() {
            return yield* resumable(() => failRecoverable(cause));
          },
          function* recoverResumable(error) {
            seenError.resolve(error);
            return handled(value);
          },
        );
      });

      await expect(settled).resolves.toBe(value);
      const actualError = await seenError.promise;

      expect(actualError).toBeInstanceOf(ScopeError);
      expect(actualError).not.toBe(cause);
      expect(actualError).toMatchObject({
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
      given: ["recovered:canceled"] as const,
      outcome: {
        error: {
          kind: "canceled",
        },
        value: "recovered:canceled",
      } as const,
    },
  ])(
    "guard receives child cancellation errors and applies recovery",
    async ({ given: [value], outcome }) => {
      const seenError = Promise.withResolvers<ScopeExitError>();
      const settled = run(function* awaitRecoveredCancellation() {
        return yield* guard(
          function* runGuardedEntry() {
            return yield* resumable(function* cancelRecoverableScope(): RiteCoroutine<string> {
              throw new CanceledError();
            });
          },
          function* recoverCancellation(error) {
            seenError.resolve(error);
            return handled(value);
          },
        );
      });

      await expect(settled).resolves.toBe(outcome.value);
      await expect(seenError.promise).resolves.toBeInstanceOf(CanceledError);
      await expect(seenError.promise).resolves.toMatchObject(outcome.error);
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
      expect(findFailureByKind(actual, outcome.external.kind)).toMatchObject({
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
            return handled(value);
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
      outcome: {
        error: {
          kind: "scope",
        },
        value: "delegated:recovered",
      } as const,
    },
  ])(
    "delegates recovery to an ancestor guard when the handler declines recovery",
    async ({ given: [cause, value], outcome }) => {
      const innerError = Promise.withResolvers<ScopeExitError>();
      const outerError = Promise.withResolvers<ScopeExitError>();
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
                return delegate();
              },
            );
          },
          function* recoverInAncestor(error) {
            outerError.resolve(error);
            return handled(value);
          },
        );
      });

      await expect(settled).resolves.toBe(outcome.value);
      await expect(innerError.promise).resolves.toMatchObject(outcome.error);
      await expect(outerError.promise).resolves.toMatchObject(outcome.error);
    },
  );
});

function handled<Value>(value: Value): readonly [true, Value] {
  return [true, value];
}

function delegate(): readonly [false] {
  return [false];
}

function* failByThrowing(cause: Error): RiteCoroutine<string> {
  throw cause;
}

function* failByRejectedPromise(cause: Error): RiteCoroutine<string> {
  return yield* until(() => Promise.reject(cause));
}
