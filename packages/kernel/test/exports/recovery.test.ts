import { describe, expect, test } from "vitest";
import { future, guard, halt, resumable, settle, wait } from "#/index";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import type { ScopeFailure } from "#/failures";
import { pipe } from "fp-ts/function";
import { right } from "#/utils";
import { wisp } from "#/internal/fp";

describe("/ primitives: guard, resumable", () => {
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
        "recovered:halted",
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
  ])(
    "guard receives resumable failures as scope failures and can recover from their cause",
    ({ given: [failure, recovered], outcome }) => {
      const step = interpretRitual(() =>
        pipe(
          wisp.Do,
          wisp.bind("caughtFailureHandle", () => future<ScopeFailure>()),
          wisp.bind("resumableHandle", () => future<string>()),
          wisp.bind(
            "guardExit",
            ({
              caughtFailureHandle: [, caughtFailureSettle],
              resumableHandle: [, resumableSettle],
            }) =>
              pipe(
                guard(
                  () =>
                    pipe(
                      resumable(() => halt(failure)),
                      wisp.chain(wait),
                      wisp.chain((resumableResult) => settle(resumableSettle, resumableResult)),
                    ),
                  (caught) =>
                    pipe(
                      settle(caughtFailureSettle, right(caught)),
                      wisp.chain(() => wisp.of(right(recovered))),
                    ),
                ),
                wisp.chain(wait),
              ),
          ),
          wisp.bind("caughtFailure", ({ caughtFailureHandle: [caughtFailureFuture] }) =>
            wait(caughtFailureFuture),
          ),
          wisp.bind("resumableResult", ({ resumableHandle: [resumableFuture] }) =>
            wait(resumableFuture),
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
