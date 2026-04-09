import type { FutureKey, ScopeFailure } from "#/index";
import { describe, expect, test } from "vitest";
import { guard, halt, resumable } from "#/index";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import { left, right } from "#/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

describe("/ primitives: guard, resumable", () => {
  test.for([
    {
      given: [
        {
          kind: "halted",
          message: "halted without guard",
        },
      ] as const,
      outcome: left(
        expect.objectContaining({
          cause: expect.objectContaining({
            failure: {
              kind: "halted",
              message: "halted without guard",
            },
          }),
          kind: "scope",
        }),
      ),
    },
  ])(
    "resumable returns its scope failure when no guard recovery boundary is present",
    async ({ given: [failure], outcome }) => {
      await using ritual = interpretRitual(() => resumable(() => halt(failure)));
      const step = ritual.driveSync();
      const exitFuture = unwrapRight(unwrapExited(step));
      const actual = await ritual.waitForFuture(exitFuture);

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: ["ready", "unexpected-recovery"] as const,
      outcome: {
        guardExit: right(undefined),
        resumableResult: right("ready"),
      },
    },
  ])(
    "resumable returns its entry result when it runs inside the guarded entry scope",
    async ({ given: [ready, unexpected], outcome }) => {
      let resumableFuture: FutureKey<string> | null = null;

      await using ritual = interpretRitual(() =>
        guard(
          () =>
            pipe(
              resumable(() => wisp.of(ready)),
              wisp.chain((capturedFuture) =>
                wisp.fromIO(() => {
                  resumableFuture = capturedFuture;
                }),
              ),
            ),
          () => wisp.of(right(unexpected)),
        ),
      );
      const step = ritual.driveSync();
      const guardFuture = unwrapRight(unwrapExited(step));
      assertCaptured(resumableFuture);
      const actual = {
        guardExit: await ritual.waitForFuture(guardFuture),
        resumableResult: await ritual.waitForFuture(resumableFuture),
      };

      expect(actual).toEqual(outcome);
    },
  );

  test.for([
    {
      given: [
        {
          kind: "halted",
          message: "halted for test",
        },
        right("recovered:halted"),
      ] as const,
      outcome: {
        caughtFailure: right(
          expect.objectContaining({
            cause: expect.objectContaining({
              failure: {
                kind: "halted",
                message: "halted for test",
              },
            }),
            kind: "scope",
          }),
        ),
        guardExit: right(undefined),
        resumableResult: right("recovered:halted"),
      },
    },
    {
      given: [
        {
          kind: "halted",
          message: "halted for rejected recovery",
        },
        left({
          kind: "halted",
          message: "recovery refused",
        }),
      ] as const,
      outcome: {
        caughtFailure: right(
          expect.objectContaining({
            cause: expect.objectContaining({
              failure: {
                kind: "halted",
                message: "halted for rejected recovery",
              },
            }),
            kind: "scope",
          }),
        ),
        guardExit: left(
          expect.objectContaining({
            cause: expect.objectContaining({
              failure: {
                kind: "halted",
                message: "recovery refused",
              },
            }),
            kind: "scope",
          }),
        ),
        resumableResult: left({
          kind: "halted",
          message: "recovery refused",
        }),
      },
    },
  ])(
    "guard receives resumable failures as scope failures and applies the recovery result",
    async ({ given: [entryFailure, recoveryResult], outcome }) => {
      let caughtFailure: ScopeFailure | null = null;
      let resumableFuture: FutureKey<string> | null = null;

      await using ritual = interpretRitual(() =>
        guard(
          () =>
            pipe(
              resumable(() => halt(entryFailure)),
              wisp.chain((capturedFuture) =>
                wisp.fromIO(() => {
                  resumableFuture = capturedFuture;
                }),
              ),
            ),
          (caught) =>
            pipe(
              wisp.fromIO(() => {
                caughtFailure = caught;
              }),
              wisp.chain(() => wisp.of(recoveryResult)),
            ),
        ),
      );
      const step = ritual.driveSync();
      const guardFuture = unwrapRight(unwrapExited(step));
      assertCaptured(caughtFailure);
      assertCaptured(resumableFuture);
      const actual = {
        caughtFailure: right(caughtFailure),
        guardExit: await ritual.waitForFuture(guardFuture),
        resumableResult: await ritual.waitForFuture(resumableFuture),
      };

      expect(actual).toEqual(outcome);
    },
  );
});

function assertCaptured<Captured>(value: Captured | null): asserts value is NonNullable<Captured> {
  if (value === null) {
    throw new Error("Expected test ritual to capture a value");
  }
}
