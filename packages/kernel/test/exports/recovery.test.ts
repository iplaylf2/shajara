import { describe, expect, test } from "vitest";
import { future, guard, halt, resumable, settle, wait } from "#/index";
import { interpretRitual, unwrapExited, unwrapRight } from "#test/harness";
import type { FailureShape } from "#/index";
import { pipe } from "fp-ts/function";
import { right } from "#/utils";
import { wisp } from "#/internal/fp";

describe("/ primitives: guard, resumable", () => {
  const haltedFailure = {
    kind: "halted",
    message: "halted for test",
  } as const;

  test.for([
    {
      expect: {
        guardExit: right(undefined),
        resumableResult: right("ready"),
      },
      input: ({ ready, unexpected }: { readonly ready: string; readonly unexpected: string }) =>
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
      unexpected: "unexpected-recovery",
    },
  ])(
    "resumable returns its entry result when it runs inside the guarded entry scope",
    ({ expect: expected, input, unexpected }) => {
      const step = interpretRitual(() =>
        input({
          ready: unwrapRight(expected.resumableResult),
          unexpected,
        }),
      ).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(expected);
    },
  );

  test.for([
    {
      expect: {
        caughtFailure: right(
          expect.objectContaining({
            cause: expect.objectContaining({
              failure: haltedFailure,
            }),
            kind: "scope",
          }),
        ),
        guardExit: right(undefined),
        resumableResult: right("recovered:halted"),
      },
      input: ({
        failure,
        recovered,
      }: {
        readonly failure: FailureShape;
        readonly recovered: string;
      }) =>
        pipe(
          wisp.Do,
          wisp.bind("caughtFailureHandle", () => future<FailureShape>()),
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
    },
  ])(
    "guard receives resumable failures as scope failures and can recover from their cause",
    ({ expect: expected, input }) => {
      const step = interpretRitual(() =>
        input({
          failure: haltedFailure,
          recovered: unwrapRight(expected.resumableResult),
        }),
      ).driveSync();
      const actual = unwrapRight(unwrapExited(step));

      expect(actual).toEqual(expected);
    },
  );
});
