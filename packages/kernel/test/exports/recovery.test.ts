import type { FutureKey, ScopeFailure } from "#/index";
import { describe, expect, test } from "vitest";
import { enclose, future, guard, halt, resumable, settle, wait } from "#/index";
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
    ({ given: [failure], outcome }) => {
      const step = interpretRitual(() =>
        pipe(
          resumable(() => halt(failure)),
          wisp.chain(wait),
        ),
      ).driveSync();
      const actual = unwrapRight(unwrapExited(step));

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
    ({ given: [ready, unexpected], outcome }) => {
      const step = interpretRitual(() =>
        pipe(
          wisp.Do,
          wisp.bind("resumableHandle", () => future<string>()),
          wisp.bind("guardExit", ({ resumableHandle: [, resumableSettle] }) =>
            pipe(
              guard(
                () =>
                  pipe(
                    resumable(() => wisp.of(ready)),
                    wisp.chain(wait),
                    wisp.chain((resumableResult) => settle(resumableSettle, resumableResult)),
                  ),
                () => wisp.of(right(unexpected)),
              ),
              wisp.chain(wait),
            ),
          ),
          wisp.bind("resumableResult", ({ resumableHandle: [resumableFuture] }) =>
            wait(resumableFuture),
          ),
          wisp.map(({ guardExit, resumableResult }) => ({
            guardExit,
            resumableResult,
          })),
        ),
      ).driveSync();
      const actual = unwrapRight(unwrapExited(step));

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
    ({ given: [entryFailure, recoveryResult], outcome }) => {
      const step = interpretRitual(() =>
        pipe(
          wisp.Do,
          wisp.bind("caughtFailureHandle", () => future<ScopeFailure>()),
          wisp.bind("guardHandle", () => future<FutureKey<void>>()),
          wisp.bind("resumableHandle", () => future<FutureKey<string>>()),
          wisp.chainFirst(
            ({
              caughtFailureHandle: [, caughtFailureSettle],
              guardHandle: [, guardHandleSettle],
              resumableHandle: [, resumableHandleSettle],
            }) =>
              enclose(() =>
                pipe(
                  guard(
                    () =>
                      pipe(
                        resumable(() => halt(entryFailure)),
                        wisp.chain((resumableFuture) =>
                          settle(resumableHandleSettle, right(resumableFuture)),
                        ),
                      ),
                    (caught) =>
                      pipe(
                        settle(caughtFailureSettle, right(caught)),
                        wisp.chain(() => wisp.of(recoveryResult)),
                      ),
                  ),
                  wisp.chain((guardFuture) => settle(guardHandleSettle, right(guardFuture))),
                ),
              ),
          ),
          wisp.bind("caughtFailure", ({ caughtFailureHandle: [caughtFailureFuture] }) =>
            wait(caughtFailureFuture),
          ),
          wisp.bind("guardExit", ({ guardHandle: [guardHandleFuture] }) =>
            waitCapturedFuture(guardHandleFuture),
          ),
          wisp.bind("resumableResult", ({ resumableHandle: [resumableHandleFuture] }) =>
            waitCapturedFuture(resumableHandleFuture),
          ),
          wisp.map(({ caughtFailure, guardExit, resumableResult }) => ({
            caughtFailure,
            guardExit,
            resumableResult,
          })),
        ),
      ).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(outcome);
    },
  );
});

function waitCapturedFuture<Result>(futureKey: FutureKey<FutureKey<Result>>) {
  return pipe(wait(futureKey), wisp.map(unwrapRight), wisp.chain(wait));
}
